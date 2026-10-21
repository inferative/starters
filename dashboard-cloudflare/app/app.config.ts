/**
 * The navigation of the dashboard. It lists the areas that `server/app.module.ts` composes, each at its place below
 * `/`. An entry's `feature` is the capability name that a package announces at boot, so an entry disappears when
 * its backend is not composed. `placement` puts an entry in the main list (the default), the second list, the
 * Settings group or the account menu, and `order` sorts each list.
 */
export default defineAppConfig({
  // Nuxt UI's table cells, one step narrower at the sides, so that an eight-column list fits at 1440 px.
  ui: {
    table: { slots: { th: "px-3", td: "px-3" } }
  },
  dashboard: {
    navigation: [
      // The work list: the start page, the inbox, the projects and the agents, then the editorial areas.
      { label: "Home", icon: "i-lucide-house", to: "/", order: 0, shortcut: "h" },
      {
        label: "Inbox",
        icon: "i-lucide-inbox",
        to: "/inbox",
        shortcut: "i",
        order: 1,
        badgeFrom: "inboxUnread",
        feature: "notifications.inbox",
        scopes: ["inbox:read"]
      },
      {
        label: "Projects",
        icon: "i-lucide-folder-kanban",
        to: "/projects",
        shortcut: "j",
        order: 2,
        feature: "projects",
        scopes: ["projects:read"]
      },
      {
        label: "Agents",
        icon: "i-lucide-bot",
        to: "/agents",
        order: 3,
        feature: "agents",
        scopes: ["agents:read"]
      },
      {
        label: "Pages",
        icon: "i-lucide-list-tree",
        to: "/pages",
        shortcut: "p",
        order: 10,
        followsChannel: true,
        feature: "pages",
        scopes: ["pages:read"]
      },
      {
        label: "Content",
        icon: "i-lucide-file-text",
        to: "/content",
        shortcut: "c",
        childrenFrom: "contentTypes",
        defaultOpen: true,
        order: 11,
        followsChannel: true,
        feature: "content",
        scopes: ["content:read"]
      },
      {
        label: "Files",
        icon: "i-lucide-folder-open",
        to: "/files",
        shortcut: "f",
        order: 12,
        channelAreas: ["/files/galleries"],
        feature: "files",
        scopes: ["files:read"]
      },
      {
        label: "Visual editor",
        icon: "i-lucide-square-mouse-pointer",
        to: "/visual-editor",
        shortcut: "v",
        order: 13,
        followsChannel: true,
        feature: "visual-editing",
        scopes: ["visual-editing:read"]
      },
      {
        label: "Publishing",
        icon: "i-lucide-send",
        to: "/publishing",
        shortcut: "u",
        order: 14,
        followsChannel: true,
        feature: "publishing",
        scopes: ["publishing:read"]
      },
      {
        label: "Translations",
        icon: "i-lucide-languages",
        to: "/translations",
        shortcut: "t",
        order: 15,
        feature: "localization"
      },
      {
        label: "Categories",
        icon: "i-lucide-tags",
        to: "/taxonomy",
        shortcut: "e",
        order: 16,
        feature: "taxonomy",
        scopes: ["taxonomy:read"]
      },
      {
        label: "SEO",
        icon: "i-lucide-radar",
        to: "/seo",
        shortcut: "s",
        order: 17,
        followsChannel: true,
        feature: "seo",
        scopes: ["seo:read"]
      },

      // The second list: what the organization measures, and the applets.
      {
        label: "Dashboards",
        icon: "i-lucide-chart-column",
        shortcut: "d",
        order: 20,
        placement: "secondary",
        feature: "dashboards",
        childrenFrom: "pinnedDashboards",
        defaultOpen: true,
        children: [{ label: "All dashboards", icon: "i-lucide-layout-grid", to: "/dashboards" }]
      },
      {
        label: "Alerts",
        icon: "i-lucide-bell-ring",
        to: "/settings/alerts",
        shortcut: "a",
        order: 21,
        placement: "secondary"
      },
      {
        label: "Applets",
        icon: "i-lucide-puzzle",
        to: "/applets",
        order: 22,
        placement: "secondary",
        feature: "applets"
      },

      // The setup of the organization, alone at the bottom. The shell adds the organization's own settings page.
      {
        label: "Settings",
        icon: "i-lucide-settings",
        order: 30,
        placement: "settings",
        childrenFrom: "organizationSettings",
        defaultOpen: true,
        children: [
          {
            label: "People and departments",
            icon: "i-lucide-network",
            to: "/settings/people",
            order: 5,
            feature: "identity.chart",
            scopes: ["identity.chart:read"]
          },
          {
            label: "Channels",
            icon: "i-lucide-radio-tower",
            to: "/settings/channels",
            shortcut: "n",
            order: 10,
            feature: "channels",
            scopes: ["channels:read"]
          },
          {
            label: "Realtime",
            icon: "i-lucide-radio",
            to: "/settings/realtime",
            order: 20,
            feature: "realtime",
            scopes: ["realtime:inspect"]
          }
        ]
      },

      // The person's own pages, in the account menu.
      {
        label: "Profile",
        icon: "i-lucide-user",
        to: "/settings/profile",
        order: 40,
        placement: "userMenu"
      },
      {
        label: "Security",
        icon: "i-lucide-lock",
        to: "/settings/security",
        order: 41,
        placement: "userMenu"
      },
      {
        label: "Connected apps",
        icon: "i-lucide-plug",
        to: "/settings/connected-apps",
        order: 42,
        placement: "userMenu"
      }
    ]
  }
});
