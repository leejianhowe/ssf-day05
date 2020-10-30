const express = require('express')
const hbs = require('express-handlebars')
const fetch = require('node-fetch')
const withQuery = require('with-query').default

// configure env variables
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000
const API_KEY = process.env.API_KEY

// start resources
let cache = []

// start app
const app = express()
// set view engine
app.engine('hbs', hbs({
    defaultLayout: 'main.hbs'
}))
app.set('view engine', 'hbs')

// parse application/x-www-form-urlencoded
app.use(express.urlencoded({
    extended: true
}))
// parse application/json
app.use(express.json())

// create check function to check cache
const checkCache = (cache, url) => {
    for (let ele of cache) {
        if (ele.searchQuery === url) {
            console.info(ele.timestamp)
            const checkTime = (Date.now() - ele.timestamp)/1000/60
            console.info(checkTime)
            if (checkTime < 1) {
                return ele.data
            }
        }
    }
    return false
}

// configure app
app.get('/', (req, res) => {
    // console.info('cache at start: ', cache)
    res.status(200).type('text/html')
    res.render('search')
})

app.get('/search', async (req, res) => {
    console.info('check cache',cache)
    const url = withQuery('https://newsapi.org/v2/top-headlines', {
        country: req.query.country,
        // apiKey: API_KEY,
        q: req.query.searchQuery,
        category: req.query.category
    })
    // check if search query is on local cache
    const localResult = await checkCache(cache, url)
    // if found same query, load from local cache
    if (localResult) {
        // console.info('used local cached')
        res.status(200).type('text/html')
        res.render('result', {
            loadResult: localResult
        })
    } else {
        // console.info('fetching from API', url)
        // console.info(url)
        const result = await fetch(url, {
            headers: {
                'X-Api-Key': API_KEY
            }
        })

        const news = await result.json()
        // console.info('results from API', news)
        const loadResult = news.articles.map(element => {
            return {
                title: element.title,
                url: element.url,
                image: element.urlToImage,
                date: element.publishedAt,
                summary: element.description,

            }
        })
        // store on server cache querystring and result and timestamp
        cache.push({
            searchQuery: url,
            data: loadResult,
            timestamp: Date.now()
        })
        // console.info('cache: ', cache)
        // console.info('array: ', loadResult)
        res.status(200).type('text/html')
        res.render('result', {
            loadResult: loadResult
        })
    }
})

// load static files
app.use(express.static('flags'))
app.use(express.static('public'))

// capture all other resources
app.use((req, res) => {
    res.redirect('/')
})

// APP listen
if (API_KEY) {
    app.listen(PORT, () => {
        console.log(`APP is listening on ${PORT} on ${new Date()} at https://localhost:${PORT}`)
    })
} else {
    console.log('Please input API_KEY')
}
