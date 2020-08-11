const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

let topicId = '1931', numPosts = 0;

setInterval(() => interval(), 120000);

function interval() {
    isThereNewPosts().then(bool => {
        if (bool) recordVotes()
    });
}

async function isThereNewPosts() {
    const body = await axios.get(`https://www.mafiathesyndicate.com/app.php/livetopicupdate/${topicId}/${numPosts}`);
    const newPosts = body.data.ltu_nr;
    if (newPosts) {
        numPosts += newPosts;
        return true;
    }
    return false;
}

async function recordVotes() {
    const html = await axios.get(`https://www.mafiathesyndicate.com/viewtopic.php?t=${topicId}`, {
        headers: {
            'Cookie': 'phpbb3_d3tvt_u=744; phpbb3_d3tvt_k=265f406ccba7e267; phpbb3_d3tvt_sid=5614c5d960af1897959f890c761d5d9f',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Host': 'www.mafiathesyndicate.com',
            'Pragma': 'no-cache',
            'Referer': 'https://www.mafiathesyndicate.com/index.php?sid=5614c5d960af1897959f890c761d5d9f',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:79.0) Gecko/20100101 Firefox/79.0'
        },
        withCredentials: true
    });
    if (!html) {
        return;
    }

    const $ = cheerio.load(html.data);

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

    fs.appendFileSync(`${topicId}.record`, vc);
}
