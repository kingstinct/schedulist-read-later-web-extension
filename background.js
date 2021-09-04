const browser = chrome || msBrowser || browser
let pendingTabRequests = []

browser.browserAction.onClicked.addListener( async function(tab) {

    if(pendingTabRequests.includes(tab.id)){
        console.log('There is an already ongoing req for current tab');
        return
    }
    browser.tabs.sendMessage(tab.id, {loading: true})

    const endpoint = 'https://schedulist-staging.herokuapp.com/graphql'

    const query = `
        mutation {
            addTask(data: { title: "${tab.url}" }) {
                addedTask {
                    _id
                }
            }
        }
    `
    const config = {
        method: 'POST',
        headers:{
        'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ query })
    }
    
    try {
        pendingTabRequests.push(tab.id)
        const response = await fetch(endpoint, config)
        pendingTabRequests = pendingTabRequests.filter(id => id != tab.id)

        if(response.status == 401){
            // User is not logged in
            redirectToLogin(tab.id)
            browser.tabs.sendMessage(tab.id, { clear: true })
            return
        }

        if(response.ok){
            // Website successfully added
            browser.tabs.sendMessage(tab.id, {
                msg: 'Saved successfully'
            })
        }else{
            browser.tabs.sendMessage(tab.id, {
                msg: 'Error: Please check your connection and try again',
                error: true
            })
        }
        
    } catch (error) {
        // Failed to fetch
        pendingTabRequests = pendingTabRequests.filter(id => id != tab.id)
        console.log(error);
        browser.tabs.sendMessage(tab.id, {
            msg: 'Error: Please check your connection and try again',
            error: true
        })
    }
});

const redirectToLogin = (tabId) => {
    browser.tabs.create({url: 'https://web.schedulist.app/login?closeAfterLogin=true'})
}