const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

let topicId = '1931', numPosts = 0, cookieSid = 'b76d9ee823be70efb4aa9715e4e55427';

setInterval(() => interval(), 15000);

function interval() {
    isThereNewPosts().then(bool => {
        if (bool) recordVotes()
    });
}

async function isThereNewPosts() {
    console.log('polling');
    const body = await axios.get(`https://www.mafiathesyndicate.com/app.php/livetopicupdate/${topicId}/${numPosts}`, {
        headers: {
            'Host': 'www.mafiathesyndicate.com',
            'X-Requested-With': 'XMLHttpRequest'
        }
    });
    const newPosts = body.data.ltu_nr;
    console.log(`read posts: ${numPosts}, new posts: ${newPosts}`);
    if (newPosts) {
        numPosts += newPosts;
        return true;
    }
    return false;
}

async function recordVotes() {
    console.log('recording');
    const cookieHeader = `phpbb3_d3tvt_u=744; phpbb3_d3tvt_k=97956955d7742683; phpbb3_d3tvt_sid=${cookieSid}`;
    console.log(cookieHeader);
    const html = await axios.get(`https://www.mafiathesyndicate.com/viewtopic.php?t=${topicId}`, {
        headers: {
            'Cookie': cookieHeader,
            'Host': 'www.mafiathesyndicate.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:79.0) Gecko/20100101 Firefox/79.0'
        },
        withCredentials: true
    });
    if (!html) {
        return;
    }

    if (html.headers['set-cookie']) {
        console.log(html.headers['set-cookie']);
        let newCookie = '';
        if (Array.isArray(html.headers['set-cookie'])) {
            const maybe = html.headers['set-cookie'].find(h => h.includes('phpbb3_d3tvt_sid='));
            if (maybe) newCookie = maybe.split('phpbb3_d3tvt_sid=')[1];
        } else {
            newCookie = html.headers['set-cookie'].split('phpbb3_d3tvt_sid=')[1];
        }
        console.log(`setting new cookie: ${newCookie}`);
        if (newCookie) cookieSid = newCookie.substring(0, 32);
    }

    const $ = cheerio.load(html.data);

    // make sure voters are shown
    if (!$('.poll_voters_box').length) {
        console.log('voters were not shown, oops!');
        fs.writeFileSync('not_shown.html', html.data);
        return;
    }

    let vc = `\n${new Date()}\n\n`;

    $('.polls dl').each(function(i, e) {
        if (!$(this).attr('class') || $(this).attr('class').includes('voted')) {
            const votee = $(this).children('dt').text();
            const n = $(this).children('.resultbar').text();
            vc += `${votee} (${n})`;
        } else if ($(this).attr('class').includes('poll_voters_box')) {
            const voters = $(this).children('.resultbar').text();
            vc += ` - ${voters.replace('Voters: ', '')}\n`;
        }
    });

    vc += '\n--------------------\n';

    console.log('writing to file...');
    fs.appendFileSync(`${topicId}.record`, vc);
    console.log('finished recording!');
}
