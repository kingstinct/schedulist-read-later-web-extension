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

        removeAlert(() => {
            document.body.insertAdjacentHTML('beforeend', `
                <div class="schedulist-ext-default-styles schedulist-ext-alert slide-in">
                    <div class="ext-loading">
                        <img src="${browser.runtime.getURL('assets/images/spinner.gif')}">
                        <p>Saving to Schedulist...</p>
                    </div>
                </div>
            `)
        })
    }else{
        removeAlert(() => {
            document.body.insertAdjacentHTML('beforeend', `
                <div class="schedulist-ext-default-styles schedulist-ext-alert slide-in ${request.error ? 'error' : ''}">
                    <p>${request.msg}</p>
                </div>
            `)
        })

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