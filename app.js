const year = document.getElementById('year')
if (year) year.textContent = new Date().getFullYear()

const downloadLinks = [...document.querySelectorAll('.js-download')]
const versionLabels = [...document.querySelectorAll('.js-version')]
const releaseStatus = document.getElementById('releaseStatus')
const releaseSize = document.getElementById('releaseSize')
const releaseApi = 'https://api.github.com/repos/Away232323/NYRITH-Client-Releases/releases/tags/latest'
const releasePage = 'https://github.com/Away232323/NYRITH-Client-Releases/releases'

function versionFromAsset(name = '') {
  return name.match(/NYRITH-Setup-(.+)-x64\.exe/i)?.[1] || ''
}

function prettyVersion(version = '') {
  return version
    .replace(/-alpha\.(\d+)$/i, ' Alpha $1')
    .replace(/-beta\.(\d+)$/i, ' Beta $1')
}

function prettyBytes(bytes = 0) {
  const value = Number(bytes || 0)
  if (!value) return 'Windows x64'
  const mb = value / 1024 / 1024
  return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB · Windows x64`
}

async function loadLatestRelease() {
  try {
    const response = await fetch(releaseApi, { headers: { Accept: 'application/vnd.github+json' } })
    if (!response.ok) throw new Error('No public release yet')
    const release = await response.json()
    const asset = (release.assets || []).find((item) => /NYRITH-Setup-.*-x64\.exe$/i.test(item.name))
    if (!asset?.browser_download_url) throw new Error('Installer missing')

    for (const link of downloadLinks) {
      link.href = asset.browser_download_url
      link.dataset.releaseReady = 'true'
    }

    const version = versionFromAsset(asset.name)
    if (version) {
      const label = `v${prettyVersion(version)}`
      for (const element of versionLabels) element.textContent = label
    }

    if (releaseStatus) releaseStatus.textContent = 'Download ready'
    if (releaseSize) releaseSize.textContent = prettyBytes(asset.size)
  } catch {
    for (const link of downloadLinks) {
      link.href = releasePage
      link.dataset.releaseReady = 'false'
    }
    if (releaseStatus) releaseStatus.textContent = 'Release channel setup'
    if (releaseSize) releaseSize.textContent = 'Windows x64'
  }
}

for (const anchor of document.querySelectorAll('a[href^="#"]')) {
  anchor.addEventListener('click', (event) => {
    const href = anchor.getAttribute('href')
    if (!href || href === '#') return
    const target = document.querySelector(href)
    if (!target) return
    event.preventDefault()
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

const revealObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue
    entry.target.classList.add('visible')
    revealObserver.unobserve(entry.target)
  }
}, { threshold: 0.08, rootMargin: '0px 0px -35px' })

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element))

const navLinks = [...document.querySelectorAll('.nav-links a')]
const navTargets = navLinks
  .map((link) => ({ link, target: document.querySelector(link.getAttribute('href')) }))
  .filter((item) => item.target)

const navObserver = new IntersectionObserver((entries) => {
  const visible = entries
    .filter((entry) => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
  if (!visible) return
  for (const item of navTargets) item.link.classList.toggle('active', item.target === visible.target)
}, { rootMargin: '-25% 0px -55% 0px', threshold: [0.05, 0.2, 0.5] })

for (const item of navTargets) navObserver.observe(item.target)

const cursorGlow = document.getElementById('cursorGlow')
if (cursorGlow && matchMedia('(pointer:fine)').matches) {
  window.addEventListener('pointermove', (event) => {
    cursorGlow.style.left = `${event.clientX}px`
    cursorGlow.style.top = `${event.clientY}px`
  }, { passive: true })
}

const clientWindow = document.getElementById('clientWindow')
if (clientWindow && matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  clientWindow.addEventListener('pointermove', (event) => {
    const rect = clientWindow.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    clientWindow.style.transform = `rotateX(${2 - y * 2.4}deg) rotateY(${x * 2.5}deg)`
  })
  clientWindow.addEventListener('pointerleave', () => {
    clientWindow.style.transform = 'rotateX(2deg) rotateY(0deg)'
  })
}

for (const details of document.querySelectorAll('.faq details')) {
  details.addEventListener('toggle', () => {
    if (!details.open) return
    for (const other of document.querySelectorAll('.faq details[open]')) {
      if (other !== details) other.open = false
    }
  })
}

loadLatestRelease()
