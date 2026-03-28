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
      reject(new Error('Server URL not configured'))
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
        resolve(res.data)
      },
      fail(err) {
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
