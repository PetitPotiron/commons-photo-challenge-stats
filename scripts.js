/* Functions */
function get_api_url(challenge_name, action = "") {
    return `https://commons.wikimedia.org/w/api.php?action=parse&page=Commons:Photo_challenge/${challenge_name}${action}&prop=text&formatversion=2&format=json&origin=*`
}
function get_page(url, f) {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url)
    xhr.send()
    xhr.onreadystatechange = (e) => {
        if (xhr.readyState == 4) { // when loaded
            f(xhr)
        }
    }
}

/* Code */
/** Inition **/
const results = document.getElementById('results')
const params = new URLSearchParams(document.location.search)
let stats = {}


if (params.get("challenge-name") == null) { params.set("challenge-name", "") }
const challenge_name = params.get("challenge-name").replaceAll(' ', '_')


if ("" == challenge_name) { console.log("no params") }
else {
    document.getElementById('challenge-name').value = challenge_name
    let api_url = get_api_url(challenge_name)
    console.log('API URL for this photo challenge', api_url)

    /* first get the photo challenge entries page, and count the entries */
    var entries = []
    var images = []
    var pov = []
    get_page(api_url, (xhr) => {
        results.innerHTML = JSON.parse(xhr.response).parse.text
        entries = Array.from(results.getElementsByTagName('a'), (a) => { if (a.className == "mw-file-description") { return a.href } })
        entries = entries.filter((entry) => { return (entry != null) }) // pictures
        console.log("entries", entries)

        /* then get the photo challenge voting page */
        api_url = get_api_url(challenge_name, action = '/Voting')
        console.log('API URL for this photo challenge', api_url)
        get_page(api_url, (req) => {
            results.innerHTML = JSON.parse(req.response).parse.text
            images = Array.from(results.getElementsByTagName('a'), (a) => { if (a.className == "mw-file-description") { return a } })

            /* keep the pictures of the voting page which are on the entries page */
            images = images.filter((entry) => { return (entry != null) }) // pictures
            images = images.filter((image) => { return entries.includes(image.href) }) // keep the entries, remove the example and exclude the example files on the entry pages
            console.log("images", images)
            stats.entries_number = images.length

            /* get the voters POV for each entry */
            console.log(pov)
            /* get all the <ul> of POV */
            pov = Array.from(images, (im) => { return { score: 0, support: 0, href: im.href } })
            console.log(pov)
            var spans = []
            for (ul of document.getElementsByTagName('ul')) {
                var im = ul.previousSibling // the image to which the povs are attached to
                while (im.tagName != 'FIGURE') {
                    im = im.previousSibling
                }
                im = images.indexOf(im.children[0])
                if (im != -1) { // get rid of the example !!!
                    for (li of ul.children) {
                        spans.push(Array.from(li.children).filter((child) => { return ((child.tagName == 'SPAN') && !(child.hasAttribute('data-mw-comment-start')) && !(child.hasAttribute('data-mw-comment-end')) && !(child.hasAttribute('data-mw-thread-id'))) })[0])
                    }
                    spans = spans.filter((span) => {
                        return span != null
                    })
                    var score = 0
                    var support = 0
                    spans = Array.from(spans, (span) => {
                        for (child of Array.from(span.children)) {
                            span.removeChild(child)
                        }
                        support++
                        if (span.innerText.startsWith("★★★")) {
                            score += 3
                        } else if (span.innerText.startsWith('★★')) {
                            score += 2
                        } else if (span.innerText.startsWith('★')) {
                            score += 1
                        }
                    })
                    pov[im].score = score
                    pov[im].support = support
                }
            }
            console.log(pov)
            results.removeChild(results.children[0])
            stats.support = {}
            stats.score = {}
            for (image of pov) {
                stats.score[image.score] = []
                stats.support[image.support] = []
            }
            for (image of pov) {
                stats.score[image.score].push(image.href)
                stats.support[image.support].push(image.href)
            }
            var arr = Array.from(Object.keys(stats.score), (key) => parseInt(key))
            var max = arr.reduce((a, b) => Math.max(a, b), -Infinity)
            results.innerHTML += `Best score : <code>${JSON.stringify(max)}</code> by <code>${stats.score[max].join("</code>, <code>").replaceAll(document.location.origin + '/wiki/', '')}</code>`
            arr = Array.from(Object.keys(stats.support), (key) => parseInt(key))
            max = arr.reduce((a, b) => Math.max(a, b), -Infinity)
            results.innerHTML += `<br>Best support : <code>${JSON.stringify(max)}</code> by <code>${stats.support[max].join("</code>, <code>").replaceAll(document.location.origin + '/wiki/', '')}</code>`
            results.innerHTML += `<br>In case of a tie, compare supports by <a  download="${challenge_name}_results.json" href="data:text/json;base64,${btoa(JSON.stringify(stats))}">downloading</a> the entire results json file`
        })
    })

}