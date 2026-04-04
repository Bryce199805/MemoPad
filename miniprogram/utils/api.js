// Base URL is read from storage, set by login page or app.js
function getBaseUrl() {
  return wx.getStorageSync('memo_base_url') || ''
}

function getApiKey() {
  return wx.getStorageSync('memo_api_key') || ''
}

function request(options) {
  return new Promise((resolve, reject) => {
    let baseUrl = getBaseUrl()
    if (!baseUrl) {
      const err = new Error('Server URL not configured')
      err.errorCode = 'SERVER_NOT_CONFIGURED'
      reject(err)
      return
    }

    let url = baseUrl + options.url
    // Prevent double slashes
    if (baseUrl.endsWith('/') && options.url.startsWith('/')) {
      url = baseUrl.slice(0, -1) + options.url
    }

    wx.request({
      url: url,
      method: options.method || 'GET',
      data: options.data || {},
      timeout: 15000,
      header: {
        'Content-Type': 'application/json',
        'X-API-Key': getApiKey()
      },
      success(res) {
        if (res.statusCode === 401) {
          wx.removeStorageSync('memo_api_key')
          wx.redirectTo({ url: '/pages/login/login' })
          reject(new Error('Unauthorized'))
          return
        }
        // Surface server-side errors as rejections so callers can handle error codes
        if (res.data && !res.data.success) {
          const err = new Error(res.data.error || 'Request failed')
          err.errorCode = res.data.error_code
          err.statusCode = res.statusCode
          reject(err)
          return
        }
        resolve(res.data)
      },
      fail(err) {
        // wx.request fail: network error, timeout, domain not whitelisted, etc.
        if (!err.errorCode) {
          err.errorCode = 'NETWORK_ERROR'
        }
        reject(err)
      }
    })
  })
}

function get(url) { return request({ url, method: 'GET' }) }
function post(url, data) { return request({ url, method: 'POST', data }) }
function put(url, data) { return request({ url, method: 'PUT', data }) }
function patch(url, data) { return request({ url, method: 'PATCH', data }) }
function del(url) { return request({ url, method: 'DELETE' }) }

module.exports = { request, get, post, put, patch, del, getBaseUrl, getApiKey }
