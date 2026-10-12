/**
 * The navigation of the dashboard. It lists the areas that `server/app.module.ts` composes, each at its place
 * under `/admin`. An entry's `feature` is the capability name that a package announces at boot, so an entry
 * disappears when its backend is not composed.
 */
export default defineAppConfig({
  dashboard: {
    navigation: [
      { label: "Home", icon: "i-lucide-house", to: "/admin", order: 0, shortcut: "h" },
      {
        label: "Pages",
        icon: "i-lucide-list-tree",
        to: "/admin/pages",
        shortcut: "p",
        order: 10,
        followsChannel: true,
        feature: "pages",
        scopes: ["pages:read"]
      },
      {
        label: "Content",
        icon: "i-lucide-file-text",
        to: "/admin/content",
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
        to: "/admin/files",
        shortcut: "f",
        order: 12,
        channelAreas: ["/admin/files/galleries"],
        feature: "files",
        scopes: ["files:read"]
      },
      {
        label: "Visual editor",
        icon: "i-lucide-square-mouse-pointer",
        to: "/admin/visual-editor",
        shortcut: "v",
        order: 13,
        followsChannel: true,
        feature: "visual-editing",
        scopes: ["visual-editing:read"]
      },
      {
        label: "Publishing",
        icon: "i-lucide-send",
        to: "/admin/publishing",
        shortcut: "u",
        order: 14,
        followsChannel: true,
        feature: "publishing",
        scopes: ["publishing:read"]
      },
      {
        label: "SEO",
        icon: "i-lucide-radar",
        to: "/admin/seo",
        shortcut: "s",
        order: 17,
        followsChannel: true,
        feature: "seo",
        scopes: ["seo:read"]
      },
      {
        label: "Settings",
        icon: "i-lucide-settings",
        order: 30,
        placement: "settings",
        childrenFrom: "organizationSettings",
        defaultOpen: true,
        children: [
          {
            label: "Channels",
            icon: "i-lucide-radio-tower",
            to: "/admin/settings/channels",
            shortcut: "n",
            order: 10,
            feature: "channels",
            scopes: ["channels:read"]
          }
        ]
      },
      {
        label: "Profile",
        icon: "i-lucide-user",
        to: "/admin/settings/profile",
        order: 40,
        placement: "userMenu"
      },
      {
        label: "Security",
        icon: "i-lucide-lock",
        to: "/admin/settings/security",
        order: 41,
        placement: "userMenu"
      },
      {
        label: "Connected apps",
        icon: "i-lucide-plug",
        to: "/admin/settings/connected-apps",
        order: 42,
        placement: "userMenu"
      }
    ]
  }
});
