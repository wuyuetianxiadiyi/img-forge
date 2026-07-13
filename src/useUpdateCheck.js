import { useState, useEffect, useCallback } from 'react'

// version.json 地址（GitHub raw，国内可用 ghproxy 加速）
const UPDATE_URL = 'https://raw.githubusercontent.com/wuyuetianxiadiyi/img-forge/main/version.json'

// 语义版本号比较
function semverCompare(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1
    if ((pa[i] || 0) < (pb[i] || 0)) return -1
  }
  return 0
}

export function useUpdateCheck(currentVersion) {
  const [update, setUpdate] = useState(null)  // null=无更新, {version, apkUrl, notes}
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(null)

  const check = useCallback(async () => {
    setChecking(true)
    setError(null)
    try {
      const res = await fetch(UPDATE_URL, { cache: 'no-cache' })
      if (!res.ok) throw new Error(`服务器 ${res.status}`)
      const remote = await res.json()

      if (semverCompare(remote.version, currentVersion) > 0) {
        setUpdate({
          version: remote.version,
          apkUrl: remote.apkUrl,
          notes: remote.notes || '无更新说明',
          pub_date: remote.pub_date,
        })
      } else {
        setUpdate(null)
      }
    } catch (e) {
      setError(e.message)
      setUpdate(null)
    } finally {
      setChecking(false)
    }
  }, [currentVersion])

  // 自动检查（启动后延迟 3 秒）
  useEffect(() => {
    const timer = setTimeout(check, 3000)
    return () => clearTimeout(timer)
  }, [check])

  return { update, checking, error, check }
}
