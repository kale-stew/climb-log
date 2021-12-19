// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (url) => {
  window.gtag('config', 'G-W9WRKKHEN8', {
    page_path: url,
  })
}

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event = (action, value, path, label, pageTitle) => {
  if (window && window.dataLayer) {
    window.dataLayer.push({
      event: action,
      value: value,
      pagePath: `https://www.kylies.photos${path}`,
      pageTitle: pageTitle,
      visitorType: 'HARD CODED VISITOR',
      label: label,
    })
  } else {
    console.warn('Google Analytics may be disabled')
  }
}
