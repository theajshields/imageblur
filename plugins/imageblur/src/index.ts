import { findByName, findByProps, findByStoreName } from "@vendetta/metro";
import { before } from "@vendetta/patcher";
import Settings from "./Settings";

const EXCLUDED_USER_ID = "950554951342522429";

let patches: (() => void)[] = [];

// Helper to recursively apply spoiler tags to a message object
function spoilerizeMessage(message: any) {
  if (!message) return;

  // Skip if message is sent by the excluded user
  if (message.author?.id === EXCLUDED_USER_ID) return;

  // 1. Force spoiler on direct attachments
  if (message.attachments?.length) {
    for (const attachment of message.attachments) {
      attachment.spoiler = true;
    }
  }

  // 2. Handle Forwarded Messages (Message Snapshots)
  if (message.messageSnapshots?.length) {
    for (const snapshot of message.messageSnapshots) {
      if (snapshot.message) {
        spoilerizeMessage(snapshot.message);
      }
    }
  }
}

export default {
  onLoad() {
    const createMessageContent = findByName("createMessageContent", false);
    if (!createMessageContent) return;

    // Patch the message render builder
    patches.push(
      before("default", createMessageContent, (args) => {
        const content = args[0];
        if (!content?.message || !content?.options) return;

        // Skip spoiling options if the message is from the excluded user
        if (content.message.author?.id === EXCLUDED_USER_ID) return;

        // Force render options to obscure spoilers
        content.options.inlineEmbedMedia = false;
        content.options.shouldObscureSpoiler = true;

        // Process attachments for both standard & forwarded messages
        spoilerizeMessage(content.message);

        return args;
      })
    );

    // Re-render currently visible messages in the active channel
    this.refreshCurrentChannel();
  },

  refreshCurrentChannel() {
    try {
      const SelectedChannelStore = findByStoreName("SelectedChannelStore");
      const FluxDispatcher = findByProps("dispatch", "subscribe");

      const channelId = SelectedChannelStore?.getChannelId();
      if (channelId && FluxDispatcher) {
        // Dispatching a channel select refresh forces React to re-render visible message items
        FluxDispatcher.dispatch({
          type: "CHANNEL_SELECT",
          channelId: channelId,
        });
      }
    } catch (e) {
      // Fail silently if store structures differ on specific builds
    }
  },

  onUnload() {
    for (const unpatch of patches) unpatch?.();
    patches = [];

    // Refresh again to restore original state for visible messages
    this.refreshCurrentChannel();
  },

  settings: Settings,
};