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

const ENDPOINT = 'https://schedulist-production.herokuapp.com/graphql'

if(b.contextMenus){

    const menus = b.contextMenus || b.menus;
    menus.removeAll();
    
    menus.create(
        {
            id: 'link-context-save',
            title: 'Save to Schedulist',
            contexts: ['link']
        }
    )

    menus.create(
        {
            id: 'browser-action-context-save',
            title: 'Save this page to Schedulist',
            contexts: ['browser_action']
        }
    )

    /*try {
        menus.create(
            {
                id: 'bookmark-context-save',
                title: 'Save to Schedulist',
                contexts: ['bookmark']
            }
        )
    } catch (e){
        console.warn('Bookmark context menu extensions are not supported in this browser')
    }
    

    
    try {
        menus.create(
            {
                id: 'tab-context-save',
                title: 'Save to Schedulist',
                contexts: ['tab']
            }
        )
    
        menus.create(
            {
                id: 'tab-context-save-and-close',
                title: 'Save to Schedulist and close',
                contexts: ['tab']
            }
        )
    } catch(e){
        console.log('Tab context menu extensions are not supported in this browser')
    }*/
    


    menus.create(
        {
            id: 'browser-action-context-navigate',
            title: 'Open Schedulist',
            contexts: ['browser_action']
        }
    )

    menus.create(
        {
            id: 'browser-action-context-navigate-in-new-tab',
            title: 'Open Schedulist in New Tab',
            contexts: ['browser_action']
        }
    )

    b.omnibox.setDefaultSuggestion({
        description: 'Add task to Schedulist'
    });

    b.omnibox.onInputEntered.addListener(async (text, disposition) => {
        if(text.startsWith('http')){
            switch (disposition) {
                case "currentTab":
                    b.tabs.update({url: text});
                    break;
                case "newForegroundTab":
                    b.tabs.create({url: text});
                    break;
                case "newBackgroundTab":
                    b.tabs.create({url: text, active: false});
                    break;
                }
        }
        else if(text.length > 0) {
            

    const query = `
        mutation {
            addTask(data: { title: "${text}" }) {
                addedTask {
                    _id
                }
            }
        }
    `
    
        await fetch(ENDPOINT, {
            method: 'POST',
            headers:{
            'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ query })
        })
        }
    });

    b.omnibox.onInputStarted.addListener(async (hey) => {
        console.log('onInputStarted', hey)
    });
    
    b.omnibox.onInputCancelled.addListener(async (hey) => {
        console.log('onInputCancelled', hey)
    });

    b.omnibox.onInputChanged.addListener(async (text, suggest) => {
        console.log('onInputChanged', text)

        if(text.length > 0){
            suggest([
                {content: text, description: 'Add "' + text + '" to Schedulist',},
                {content: 'https://web.schedulist.app', description: 'Open Schedulist',}
            ])
        } else {
            suggest([
                {content: 'https://web.schedulist.app', description: 'Open Schedulist',}
            ])
        }
    });

    b.contextMenus.onClicked.addListener((info, tab) => {
        if(info.menuItemId === 'link-context-save') {
            const url = info.linkUrl;
            saveLink(tab, url)
        } else if(info.menuItemId === 'browser-action-context-save') {
            saveLink(tab)
        } else if(info.menuItemId === 'browser-action-context-navigate') {
            b.tabs.update({
                url: "https://web.schedulist.app"
        });
        } else if(info.menuItemId === 'browser-action-context-navigate-in-new-tab') {
            b.tabs.create({
                url: "https://web.schedulist.app"
        });
        } /*else if(info.menuItemId === 'bookmark-context-save') {
            const id = info.bookmarkId;
            b.bookmarks.get(id, bookmark => {
                if(bookmark.url){
                    saveLink(tab, bookmark.url)
                }
            });
            
        } else if (info.menuItemId === 'tab-context-save') {
            saveLink(tab)
        } else if (info.menuItemId === 'tab-context-save-and-close') {
            saveLink(tab).then(() => b.tabs.discard(tab.id));
            
        }*/
    });

    b.commands.onCommand.addListener(async function (command) {
        if (command === "save-to-schedulist") {
            b.tabs.query({active: true, windowId: b.windows.WINDOW_ID_CURRENT}, tabs => {
                b.tabs.get(tabs[0].id, tab => saveLink(tab))
            })
        }
      });
}

/**
 * 
 * @param {Tab} tab 
 * @param {string?} overrideLink 
 * @returns 
 */
async function saveLink(tab, overrideLink) {
    const link = overrideLink || tab.url
    if(pendingTabRequests.includes(tab.id)){
        console.log('There is an already ongoing req for current tab');
        return
    }
    b.tabs.sendMessage(tab.id, {loading: true})

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
        const response = await fetch(ENDPOINT, {
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

  
b.browserAction.onClicked.addListener(saveLink);
