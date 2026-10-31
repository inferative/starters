// The declarations of this website: its content types. `pnpm sync:manifest` (`inferative site sync`) publishes them
// to the channel, and the dashboard then shows an editor for each type. The values of a deployment (the channel, the
// API, the key that publishes) come from `.env`, never from this file.

import { BlueprintTextFormat, EntityField } from "@inferative/sdk/common";
import { defineContentType } from "@inferative/sdk/content";
import { defineSite, starterSectionComponents } from "@inferative/sdk/site";

/** The content types of this website. Add a type here to give the site another kind of content. */
const siteContentTypes = {
  post: defineContentType({
    key: "post",
    title: "Post",
    plural: "Posts",
    titlePath: "title",
    form: { sections: [{ fields: ["title", "slug"] }, { fields: ["body"] }] },
    fields: {
      title: EntityField.text({ maxLength: 255 }).label("Title").declaration,
      // The address of a post: `/<slug>`. The page reads a post by it. Three characters at least: `.` and `..` would
      // address `/`, and a text field takes no pattern.
      slug: EntityField.text({ minLength: 3, maxLength: 255, trim: true })
        .unique("type")
        .label("Slug").declaration,
      body: EntityField.text({ format: BlueprintTextFormat.Multiline, optional: true }).label(
        "Body"
      ).declaration
    }
  })
};

export default defineSite({
  contentTypes: siteContentTypes,
  sectionTypes: {},
  firstSyncSectionTypes: {},
  unclaimedSectionKeys: [],
  // The audit of `inferative site check` and `sync` compares the section catalog with the section components of the
  // `@inferative/site` layer. This website uses no layer and declares no section, so it names those components here.
  optInSectionSets: [{ declarations: {}, components: starterSectionComponents }]
});
