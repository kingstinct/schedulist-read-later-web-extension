window.browser = (() => {
    return window.msBrowser ||
        window.browser ||
        window.chrome;
})();

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if(request.clear){
        removeAlert()
        console.log('cleared');
        return
    }

    if(request.loading){
        if(document.querySelector('.schedulist-ext-alert .ext-loading')) return

        removeAlert(createLoadingAlert)
    }else{
        removeAlert(() => createMsgAlert(request.msg, request.error))

        setTimeout(() => {
            removeAlert()
        }, 3000);
    }

})

const removeAlert = (callback) => {
    const el = document.querySelector('.schedulist-ext-alert')
    
    if (el){
        el.classList.remove('slide-in')
        el.classList.add('slide-out')
        setTimeout(() => {
            if(el && el.parentElement) el.parentElement.removeChild(el)
            if(callback) callback()
        }, 500);
    }else{
        if(callback) callback()
    }
}

const createLoadingAlert = () => {
    const wrapper = document.createElement('div')
    wrapper.className = 'schedulist-ext-default-styles schedulist-ext-alert slide-in'
    document.body.appendChild(wrapper)

    const activityIndicatorWrapper = document.createElement('div')
    activityIndicatorWrapper.className = 'ext-loading'
    wrapper.appendChild(activityIndicatorWrapper)

    const img = document.createElement('img')
    img.src = browser.runtime.getURL('assets/images/spinner.gif')
    activityIndicatorWrapper.appendChild(img)

    const text = document.createElement('p')
    text.textContent = 'Saving to Schedulist...'
    activityIndicatorWrapper.appendChild(text)
}

const createMsgAlert = (msg, error) => {
    const wrapper = document.createElement('div')
    wrapper.className = 'schedulist-ext-default-styles schedulist-ext-alert slide-in'
    if(error) wrapper.classList.add('error')
    document.body.appendChild(wrapper)

    const text = document.createElement('p')
    text.textContent = msg
    wrapper.appendChild(text)
}