const fs = require('fs')
const request = require('request');
const exec = require('child_process').exec;

if(process.argv.length < 4) {
  console.log('please retry with [user_id] and [required_count]')
  return;
}

const USER_ID = process.argv[2];
let REQUIRED_COUNT = process.argv[3];
const REQUEST_COUNT = 100;
let outputPath = `./${USER_ID}.json`
let proxy = null;

process.argv.forEach((arg, i) => {
  if(arg == '--output-path') {
    outputPath = process.argv[i+1];
  }
  else if(arg == '--proxy') {
    proxy = process.argv[i+1];
  }
})
const OUTPUT_PATH = outputPath;

function run() {
  const r = request.defaults({proxy})

  r.get(`https://www.instagram.com/${USER_ID}`, (err, response, body) => {
    const raw = body;
    const userMetaStartStr = 'window._sharedData = ';
    const startMetaIdx = raw.indexOf(userMetaStartStr);
    const endMetaIdx = startMetaIdx + raw.substring(startMetaIdx).indexOf('</script>');
    const targetStr = raw.substring(startMetaIdx, endMetaIdx).replace(userMetaStartStr, '').trim();
    const userMeta = JSON.parse(targetStr.substring(0, targetStr.length - 1));

    const csrfToken = userMeta.config.csrf_token;
    const user = userMeta.entry_data.ProfilePage[0].user;
    const userId = user.id;
    const userName = user.username;
    const endCursor = user.media.page_info.end_cursor;
    const INIT_KICK_REQUEST = `'https://www.instagram.com/query/' -H 'origin: https://www.instagram.com' -H 'accept-encoding: gzip, deflate, br' -H 'accept-language: ko-KR,ko;q=0.8,en-US;q=0.6,en;q=0.4' -H 'x-requested-with: XMLHttpRequest' -H 'cookie: mid=WPsAAQAEAAEbONxRdk8eINPKwOj0; ig_mcf_shown=1650524562300; rur=PRN; s_network=""; csrftoken=${csrfToken}; ig_vw=917; ig_pr=1' -H 'x-csrftoken: ${csrfToken}' -H 'pragma: no-cache' -H 'x-instagram-ajax: 1' -H 'user-agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.59 Safari/537.36' -H 'content-type: application/x-www-form-urlencoded' -H 'accept: */*' -H 'cache-control: no-cache' -H 'authority: www.instagram.com' -H 'referer: https://www.instagram.com/${userName}/' --data 'q=ig_user(${userId})+%7B+media.after(${endCursor}%2C+${REQUEST_COUNT})+%7B%0A++count%2C%0A++nodes+%7B%0A++++__typename%2C%0A++++caption%2C%0A++++code%2C%0A++++comments+%7B%0A++++++count%0A++++%7D%2C%0A++++comments_disabled%2C%0A++++date%2C%0A++++dimensions+%7B%0A++++++height%2C%0A++++++width%0A++++%7D%2C%0A++++display_src%2C%0A++++id%2C%0A++++is_video%2C%0A++++likes+%7B%0A++++++count%0A++++%7D%2C%0A++++owner+%7B%0A++++++id%0A++++%7D%2C%0A++++thumbnail_src%2C%0A++++video_views%0A++%7D%2C%0A++page_info%0A%7D%0A+%7D&ref=users%3A%3Ashow&query_id=17849115430193904' --compressed`;

    extractInstaData(INIT_KICK_REQUEST, REQUIRED_COUNT).then((instaData) => {
      const jsonStr = JSON.stringify(instaData);
      fs.writeFile(OUTPUT_PATH, jsonStr, 'utf8', (err) => {
        if(err) {
          console.log("============= error =============");
          console.log(err);
        }

        console.log(`done !!!\ncheck ${OUTPUT_PATH}`);
      });
    });
  })
}


function extractInstaData(kickReqeust, requiredCount) {
  const extractedInstaData = [];
  const endPointConfigStr = 'media.after('
  const si = kickReqeust.indexOf(endPointConfigStr);
  const ei = si + kickReqeust.substring(si).indexOf('%2C+')

  const prevUrl = `${kickReqeust.substring(0, si)}${endPointConfigStr}`;
  const postUrl = `${kickReqeust.substring(ei)}`;

  return new Promise((resolve) => {

    const requstToInsta = (url) => {
      let curlCommand = `curl ${url}`;
      if(proxy) {
        curlCommand += ` --proxy ${proxy}`;
      }
      exec(curlCommand, (err, stdout, stderr) => {

        if(!err) {
          const res = JSON.parse(stdout);
          if(res.media.count < REQUIRED_COUNT) {
            requiredCount = res.media.count;
          }
          extractedInstaData.push(...extractFromMetas(res.media.nodes));

          console.log("current extracted length: " + extractedInstaData.length);
          if(extractedInstaData.length < requiredCount) {
            const nextUrl = `${prevUrl}${res.media.page_info.end_cursor}${postUrl}`;
            requstToInsta(nextUrl);
          } else {
            resolve(extractedInstaData);
          }
        } else {
          console.log("==========err==========")
          console.log(err);
          resolve(extractedInstaData);
        }

        // console.log("==========stderr==========")
        // console.log(stderr);
      });
    }

    requstToInsta(kickReqeust);
  })
}

function extractFromMetas(metas) {
  return metas.map((meta) => {
    const { caption, thumbnail_src, display_src, date } = meta;

    const tagsResult = (caption) ? caption
    .match(/#[^\u0000-\u007F]+|#[\w]+/gi) : null;
    const tags = (tagsResult) ? tagsResult.map((tag) => tag.replace('#','').trim().toLowerCase()) : [];

    return {
      tags,
      thumbnail_src,
      display_src,
      date: date * 1000,
      meta,
    }
  })
}

run();

// video query
// ex) https://www.instagram.com/p/BTLabKFgCCV/?taken-by=congpilates&__a=1
// https://www.instagram.com/p/${article_id}/?taken-by=${user_id}&__a=1
