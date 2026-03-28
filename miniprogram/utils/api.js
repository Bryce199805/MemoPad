const app = getApp()

function request(options) {
  return new Promise((resolve, reject) => {
    const apiKey = wx.getStorageSync('memo_api_key') || app.globalData.apiKey
    wx.request({
      url: app.globalData.baseUrl + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      timeout: 15000,
      header: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      success(res) {
        if (res.statusCode === 401) {
          wx.removeStorageSync('memo_api_key')
          app.globalData.apiKey = ''
          app.globalData.user = null
          app.globalData.isAuthenticated = false
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

module.exports = { request, get, post, put, patch, del }
