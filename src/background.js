/**
 * @typedef { import("webextension-polyfill").Browser } Browser
 */

/**
 * @typedef { import("webextension-polyfill").Tabs.Tab } Tab
 */

/** @type {Browser} */
const b = (chrome || msBrowser || browser)

/** @type {string[]} */
let pendingTabRequests = [];

const redirectToLogin = () => {
    b.tabs.create({url: 'https://web.schedulist.app/login?closeAfterLogin=true'})
}
b.browserAction.onClicked.addListener( async function(tab) {
    b.tabs.update({
        url: "https://web.schedulist.app"
   });
})


b.menus.create(
    {
        onclick: (info, tab) => {
            const url = info.linkUrl;
            saveLink(tab, url)
        },
        contexts: ['link']
    }
)

b.menus.create(
    {
        command: '_execute_page_action',
        contexts: ['browser_action'],
        title: 'Save current page to Schedulist'
    }
)

b.menus.create(
    {
        command: '_execute_browser_action',
        contexts: ['browser_action'],
        title: 'Open Schedulist'
    }
)

/**
 * 
 * @param {Tab} tab 
 * @param {string} overrideLink 
 * @returns 
 */
async function saveLink(tab, overrideLink) {
    const link = overrideLink || tab.url
    if(pendingTabRequests.includes(tab.id)){
        console.log('There is an already ongoing req for current tab');
        return
    }
    b.tabs.sendMessage(tab.id, {loading: true})

    const endpoint = 'https://schedulist-production.herokuapp.com/graphql'

    const query = `
        mutation {
            addTask(data: { title: "${link}" }) {
                addedTask {
                    _id
                }
            }
        }
    `
    
    try {
        pendingTabRequests.push(tab.id)
        const response = await fetch(endpoint, {
            method: 'POST',
            headers:{
            'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ query })
        })
        pendingTabRequests = pendingTabRequests.filter(id => id != tab.id)

        if(response.status == 401){
            // User is not logged in
            redirectToLogin()
            b.tabs.sendMessage(tab.id, { clear: true })
            return
        }

        if(response.ok){
            // Website successfully added
            b.tabs.sendMessage(tab.id, {
                msg: 'Saved successfully'
            })
        }else{
            b.tabs.sendMessage(tab.id, {
                msg: 'Error: Please check your connection and try again',
                error: true
            })
        }
        
    } catch (error) {
        // Failed to fetch
        pendingTabRequests = pendingTabRequests.filter(id => id != tab.id)
        console.log(error);
        b.tabs.sendMessage(tab.id, {
            msg: 'Error: Please check your connection and try again',
            error: true
        })
    }
}

  
b.pageAction.onClicked.addListener(saveLink);
