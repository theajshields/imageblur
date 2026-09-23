import { findByName, findByProps, findByStoreName } from "@vendetta/metro";
import { before } from "@vendetta/patcher";
import Settings from "./Settings";

let patches: (() => void)[] = [];
const BLACKLIST = ["950554951342522429"];

function isBlacklisted(message: any) {
  return BLACKLIST.includes(String(message?.author?.id));
}

function isGif(attachment: any) {
  const contentType = String(attachment?.content_type ?? "").toLowerCase();
  const fileName = String(attachment?.filename ?? "").toLowerCase();
  const url = String(attachment?.url ?? "").toLowerCase();

  return contentType === "image/gif" || /\.gif(?:$|[?#])/.test(fileName) || /\.gif(?:$|[?#])/.test(url);
}

// Helper to recursively apply spoiler tags to a message object
function spoilerizeMessage(message: any) {
  if (!message || isBlacklisted(message)) return;

  // 1. Force spoiler on direct attachments
  if (message.attachments?.length) {
    for (const attachment of message.attachments) {
      if (isGif(attachment)) continue;
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
        if (isBlacklisted(content.message)) return;

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