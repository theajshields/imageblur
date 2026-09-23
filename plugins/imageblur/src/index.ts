import { findByName, findByProps } from "@vendetta/metro";
import { before } from "@vendetta/patcher";
import Settings from "./Settings";

let patches: (() => void)[] = [];

export default {
  onLoad() {
    const createMessageContent = findByName("createMessageContent", false);
    const getChannel = findByProps("getChannel")?.getChannel;

    if (!createMessageContent) return;

    patches.push(
      before("default", createMessageContent, (args) => {
        const content = args[0];
        if (!content?.message?.channel_id || !content?.options) return;

        // Force spoiler flags on render options
        content.options.inlineEmbedMedia = false;
        content.options.shouldObscureSpoiler = true;

        const message = content.message;
        if (message?.attachments?.length) {
          for (const attachment of message.attachments) {
            attachment.spoiler = true;
          }
        }

        return args;
      })
    );
  },

  onUnload() {
    for (const unpatch of patches) unpatch?.();
    patches = [];
  },

  settings: Settings,
};