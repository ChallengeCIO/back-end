const {
    google
} = require('googleapis');
const oauth2 = google.oauth2('v2');
const express = require('express')
var cors = require('cors')
const OAuth2Data = require('./google_key.json')
const axios = require('axios')

const app = express()
app.use(cors())

const CLIENT_ID = OAuth2Data.client.id;
const CLIENT_SECRET = OAuth2Data.client.secret;
const REDIRECT_URL = OAuth2Data.client.redirect

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL)
var authed = false;

const BASE_API_PATH = "https://api.stackexchange.com/2.2/search/advanced";
const _config = {
    _listen: true,

    custom: {
        pageSize: 5,
        order: "desc",
        accepted: "True",
        showEmpty: true
    }
};


app.get('/login-google', (req, res) => {
    if (!authed) {
        // Generate an OAuth URL and redirect there
        const url = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: 'https://www.googleapis.com/auth/gmail.readonly'
        });
        console.log(url)
        res.redirect(url);
    } else {
        const gmail = google.gmail({
            version: 'v1',
            auth: oAuth2Client
        });
        gmail.users.labels.list({
            userId: 'me',
        }, (err, res) => {
            if (err) return console.log('The API returned an error: ' + err);
            const labels = res.data.labels;
            if (labels.length) {
                console.log('Labels:');
                labels.forEach((label) => {
                    console.log(`- ${label.name}`);
                });
            } else {
                console.log('No labels found.');
            }
        });
        res.send('Logged in')
    }
})

app.get('/auth/google/callback', function (req, res) {
    const code = req.query.code
    if (code) {
        // Get an access token based on our OAuth code
        oAuth2Client.getToken(code, function (err, tokens) {
            if (err) {
                console.log('Error authenticating')
                console.log(err);
            } else {
                console.log('Successfully authenticated');
                oAuth2Client.setCredentials(tokens);
                console.log('TOKEN HERE', tokens)
                oAuth2Client.credentials = tokens
                oauth2.userinfo.get(
                    (err, data) => {
                        // console.log('DATA HERE', data)
                    })
                authed = true;
                res.redirect('/')
            }
        });
    }
});

const buildUrl = ({
    message
}) => {
    let url = BASE_API_PATH;

    url += "?page=1";
    url += "&pagesize=" + _config.custom.pageSize;
    url += "&order=" + _config.custom.order;
    url += "&sort=relevance";
    url += "&accepted=" + _config.custom.accepted;
    url += "&q=" + message;
    url += "&tagged=javascript";
    url += "&site=stackoverflow";

    return encodeURI(url);
}

const finderStackoverflow = async (message) => {
    const url = buildUrl({
        message
    })
    const response = await axios.get(url)
    return response
}

app.get('/search-stackoverflow', async function (req, res) {
    const {
        message
    } = req.query
    const response = await finderStackoverflow(message)
    const result = response.data.items.map(item => {
        const {
            title,
            link,
            creation_date
        } = item
        return {
            title,
            link,
            creation_date
        }
    })
    res.send(result)

})


const port = process.env.port || 5000
app.listen(port, () => console.log(`Server running at ${port}`));