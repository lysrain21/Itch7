import FingerprintJS from '@fingerprintjs/fingerprintjs'

// 初始化FingerprintJS
const fpPromise = FingerprintJS.load()

// 获取用户唯一ID
export const getUserId = async (): Promise<string> => {
    try {
        // 尝试从本地存储获取用户ID
        const storedUserId = localStorage.getItem('itch7_user_id')
        if (storedUserId) {
            return storedUserId
        }

        // 如果没有存储的ID，生成一个新的
        const fp = await fpPromise
        const result = await fp.get()

        // 使用浏览器指纹作为用户ID的基础
        const userId = `user_${result.visitorId}`

        // 存储到localStorage以便下次使用
        localStorage.setItem('itch7_user_id', userId)

        return userId
    } catch (error) {
        console.error('Error generating user ID:', error)
        // 如果出错，返回随机ID
        const fallbackId = `user_${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem('itch7_user_id', fallbackId)
        return fallbackId
    }
}