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

const APP_URL = 'https://web.schedulist.app';
const DEFAULT_ENDPOINT = 'https://schedulist-production.herokuapp.com/graphql'
/** @returns {PromiseLike<{ appUrl: string, endpoint: string, token?: string }>}  */
const getEnvironment = () => {
    return new Promise(resolve => {
        b.storage.local.get(['token', 'appUrl', 'endpoint'], async ({token, endpoint, appUrl}) => {
            resolve({token, endpoint: endpoint || DEFAULT_ENDPOINT, appUrl: appUrl || APP_URL});
        })
    });
}

const redirectToLogin = async () => {
    const { appUrl } = await getEnvironment();
    b.tabs.create({url: appUrl + '/login?closeAfterLogin=true'})
}

const openInNewTab = async () => {
    getEnvironment().then(({appUrl}) => {
        b.tabs.create({
            url: appUrl,
        });
    });
}

const openInCurrentTab = async () => {
    getEnvironment().then(({appUrl}) => {
        b.tabs.update({
            url: appUrl
        });
    });
}


const sendQuery = (query) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { endpoint, token } = await getEnvironment();
            const response = await fetch(endpoint, {
                method: 'POST',
                headers:{
                    'Content-Type': 'application/json',
                    'authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ query })
            })

            resolve(response)
        } catch(e){
            reject(e)
        }   
    })
}

const initUI = () => {

    const onMenuClicked = (info, tab) => {
        if(info.menuItemId === 'link-context-save') {
            const url = info.linkUrl;
            saveLink(tab, url)
        } else if(info.menuItemId === 'browser-action-context-save') {
            saveLink(tab)
        } else if(info.menuItemId === 'browser-action-context-navigate') {
            openInCurrentTab();
            
        } else if(info.menuItemId === 'browser-action-context-navigate-in-new-tab') {
            openInNewTab();
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
    }

    const onOmniBoxInputEntered = async (text, disposition) => {
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
            sendQuery(query)
        }
    }

    const onInputChanged = async (text, suggest) => {
        console.log('onInputChanged', text)
        getEnvironment().then(({appUrl}) => {
            if(text.length > 0){
                suggest([
                    {content: text, description: 'Add "' + text + '" to Schedulist',},
                    {content: appUrl, description: 'Open Schedulist',}
                ])
            } else {
                suggest([
                    {content: appUrl, description: 'Open Schedulist',}
                ])
            }
        });

        
    }
    const menus = b.contextMenus || b.menus;
    
        try {
            
        
            if(menus){
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
                
                    
                    menus.onClicked.addListener(onMenuClicked);
                
                    if(b.omnibox)
                        b.omnibox.setDefaultSuggestion({
                            description: 'Add task to Schedulist'
                        });
                    
                        b.omnibox.onInputEntered.addListener(onOmniBoxInputEntered);
                
                        
                        /*b.omnibox.onInputStarted.addListener(async (hey) => {
                            console.log('onInputStarted', hey)
                        });
                        
                        b.omnibox.onInputCancelled.addListener(async (hey) => {
                            console.log('onInputCancelled', hey)
                        });*/
                
                        b.omnibox.onInputChanged.addListener(onInputChanged);
    
                    
                }
            } catch(e){
                console.warn('Something nonessential failed to load', e)
            }
        
            
            const onMessage = async (request, sender, sendResponse) => {
                console.log('got message!', request)
                if(request.type === 'login'){
                    b.storage.local.set({
                        'token': request.token,
                        'endpoint': request.endpoint,
                        'appUrl': request.appUrl,
                    });
                    console.log('token saved!')
                    b.storage.local.get('token', console.log)
                    sendResponse({success: true})
                }
                else if(request.type === 'logout'){
                    b.storage.local.remove('token');
                    sendResponse({success: true})
                }
            }
        
            b.runtime.onMessage.addListener(onMessage);

            async function onCommand(command) {
                if (command === "save-to-schedulist") {
                    b.tabs.query({active: true, windowId: b.windows.WINDOW_ID_CURRENT}, tabs => {
                        b.tabs.get(tabs[0].id, tab => saveLink(tab))
                    })
                } else if(command === "open-schedulist") {
                    openInNewTab();
                }
            }
        
            b.commands.onCommand.addListener(onCommand);
            return () => {
                b.commands.onCommand.removeListener(onCommand)
                b.runtime.onMessage.removeListener(onMessage);

                try {
                    if(menus){
                        menus.onClicked.removeListener(onMenuClicked);
                    }
                    
                
                    if(b.omnibox){
                        b.omnibox.onInputEntered.removeListener(onOmniBoxInputEntered);
                        b.omnibox.onInputChanged.removeListener(onInputChanged);
                    }   
                } catch(e){
                    console.warn('Something nonessential failed to unload', e)
                }
            }
    
}

const resetUI = initUI();



/**
 * 
 * @param {Tab} tab 
 * @param {string?} overrideLink 
 * @returns 
 */
async function saveLink(tab, overrideLink) {
    const link = overrideLink || tab.url;
    const title = tab.title;
    
    if(pendingTabRequests.includes(tab.id)){
        console.log('There is an already ongoing req for current tab');
        return
    }
    b.tabs.sendMessage(tab.id, {loading: true})

    const query = `
        mutation {
            addTask(data: { url: "${link}", title: "${title}" }) {
                addedTask {
                    _id
                }
            }
        }
    `
    
    try {
        pendingTabRequests.push(tab.id)
        const response = await sendQuery(query);
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
