import 'https://cdn.jsdelivr.net/gh/orestbida/cookieconsent@3.0.0/dist/cookieconsent.umd.js';

// https://cookieconsent.orestbida.com/essential/getting-started.html

// Enable dark mode
document.documentElement.classList.add('cc--darkmode');

function consentAnalytics(granted) {
  const status = (granted ? 'granted' : 'denied')
  console.log('consentAnalytics: ' + status)

  gtag('consent', 'update', {
    'analytics_storage': status
  });
}

CookieConsent.run({
  guiOptions: {
    consentModal: {
      layout: "box",
      position: "bottom right",
      equalWeightButtons: false,
      flipButtons: false
    },
    preferencesModal: {
      layout: "box",
      position: "right",
      equalWeightButtons: true,
      flipButtons: false
    }
  },
  categories: {
    necessary: {
      enabled: true,
      readOnly: true
    },
    analytics: {}
  },
  revision: 1,
  onChange: function ({ changedCategories, changedServices }) {
    console.log("changedCategories")
    if (changedCategories.includes('analytics')) {
      if (CookieConsent.acceptedCategory('analytics')) {
        // Analytics category was just enabled
        console.log("analytics accepted")
        consentAnalytics(true)
      } else {
        // Analytics category was just disabled
        console.log("analytics disabled")
        consentAnalytics(false)
        location.reload()
      }
    }
  },
  language: {
    default: "en",
    autoDetect: "browser",
    translations: {
      en: {
        consentModal: {
          title: "We value your privacy!",
          description: "This website uses necessary cookies to make it work. We'd like to set additional cookies to measure use analytics and performance.",
          acceptAllBtn: "Accept all",
          acceptNecessaryBtn: "Reject all",
          showPreferencesBtn: "Manage preferences",
          // footer: "<a href=\"#link\">Privacy Policy</a>\n<a href=\"#link\">Terms and conditions</a>"
        },
        preferencesModal: {
          title: "Consent Preferences Center",
          acceptAllBtn: "Accept all",
          acceptNecessaryBtn: "Reject all",
          savePreferencesBtn: "Save preferences",
          closeIconLabel: "Close modal",
          serviceCounterLabel: "Service|Services",
          sections: [
            {
              title: "Cookie Usage",
              description: 'You will find detailed information about all cookies under each consent category below. The cookies that are categorized as "Necessary" are stored on your browser as they are essential for enabling the basic functionalities of the site. We also use third-party cookies that help us analyze how you use this website. These cookies will only be stored in your browser with your prior consent.'
            },
            {
              title: "Strictly Necessary cookies <span class=\"pm__badge\">Always Enabled</span>",
              description: "These cookies are essential for the proper functioning of the website and cannot be disabled.",
              linkedCategory: "necessary"
            },
            {
              title: "Performance and Analytics",
              description: "These cookies collect information about how you use our website. All of the data is anonymized and cannot be used to identify you.",
              linkedCategory: "analytics"
            },
            // {
            //   title: "More information",
            //   description: "For any query in relation to my policy on cookies and your choices, please <a class=\"cc__link\" href=\"#yourdomain.com\">contact me</a>."
            // }
          ]
        }
      }
    }
  }
});
