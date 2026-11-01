// The declarations of this website: its content types and its section catalog. `pnpm sync:manifest`
// (`inferative site sync`) publishes them to the channel, and the dashboard then shows an editor for each type. The
// values of a deployment (the channel, the API, the key that publishes) come from `.env`, never from this file.

import { BlueprintTextFormat, EntityField } from "@inferative/sdk/common";
import { defineContentType } from "@inferative/sdk/content";
import { PageFields, menuFields, menuTypeOptions, pageTypeOptions } from "@inferative/sdk/pages";
import {
  defineSite,
  starterCommerceSections,
  starterEventSections,
  starterFormSections,
  starterMediaSections,
  starterSections,
  starterVideoSections
} from "@inferative/sdk/site";

/**
 * The content types of this website. `page` is the addressable type: a page is a title, a slug and a list of
 * sections, and the channel's page tree gives each page its address. `menu` is a stored list of links, which the
 * `navigationMenu` section reads. `post` is read by the website's own server route (`/api/latest-posts`). Add a type
 * here to give the site another kind of content.
 */
const siteContentTypes = {
  page: defineContentType({
    ...pageTypeOptions,
    form: { sections: [{ fields: ["title", "slug"] }, { fields: ["sections"] }] },
    fields: {
      ...PageFields,
      sections: EntityField.sections({ optional: true }).label("Sections").declaration
    }
  }),
  menu: defineContentType({ ...menuTypeOptions, fields: menuFields({ pageTypes: ["page"] }) }),
  post: defineContentType({
    key: "post",
    title: "Post",
    plural: "Posts",
    titlePath: "title",
    form: { sections: [{ fields: ["title", "slug"] }, { fields: ["body"] }] },
    fields: {
      title: EntityField.text({ maxLength: 255 }).label("Title").declaration,
      // Lower-case words joined by `-`, so a slug never holds `.` or `..`, whose links would address `/`.
      slug: EntityField.text({ maxLength: 255, trim: true, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" })
        .unique("type")
        .label("Slug")
        .help("Lower-case words joined by hyphens, such as my-first-post.").declaration,
      body: EntityField.text({ format: BlueprintTextFormat.Multiline, optional: true }).label(
        "Body"
      ).declaration
    }
  })
};

/** The section catalog without `sharedSection`: a channel that has never served a manifest refuses that key. */
const firstSyncSections = Object.fromEntries(
  Object.entries(starterSections).filter(([key]) => key !== "sharedSection")
);

export default defineSite({
  contentTypes: siteContentTypes,
  sectionTypes: starterSections,
  firstSyncSectionTypes: firstSyncSections,
  unclaimedSectionKeys: [],
  // The sets of the packages this website does not use. The audit of `inferative site check` then calls none of
  // their sections missing.
  optInSectionSets: [
    starterCommerceSections,
    starterEventSections,
    starterVideoSections,
    starterFormSections,
    starterMediaSections
  ]
});
