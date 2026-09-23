import { React, ReactNative } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/storage";
import { storage } from "@vendetta/plugin";
import { Forms } from "@vendetta/ui/components";

const { ScrollView, View, Text, TextInput, Switch } = ReactNative;
const { FormSection, FormDivider } = Forms;

// Initialize default storage values
storage.spoilerOwn ??= false;
storage.isWhitelist ??= false;
storage.userIds ??= "";
storage.channelIds ??= "";
storage.guildIds ??= "";

// Custom switch row layout with switch positioned directly below the label & description
const StackedSwitchRow = ({ label, subLabel, value, onValueChange }) => {
    return (
        <View style={{ paddingHorizontal: 15, paddingVertical: 12 }}>
            <Text style={{ color: "#F2F3F5", fontSize: 16, fontWeight: "500", marginBottom: 4 }}>
                {label}
            </Text>
            {subLabel ? (
                <Text style={{ color: "#B5BAC1", fontSize: 13, marginBottom: 10 }}>
                    {subLabel}
                </Text>
            ) : null}
            <View style={{ alignItems: "flex-start", marginTop: 4 }}>
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: "#4E5058", true: "#5865F2" }}
                    thumbColor="#FFFFFF"
                />
            </View>
        </View>
    );
};

const IDInputField = ({ title, description, storageKey }: { title: string; description: string; storageKey: string }) => {
    return (
        <View style={{ paddingHorizontal: 15, paddingVertical: 12 }}>
            <Text style={{ color: "#F2F3F5", fontSize: 16, fontWeight: "500", marginBottom: 4 }}>
                {title}
            </Text>
            <Text style={{ color: "#B5BAC1", fontSize: 13, marginBottom: 10 }}>
                {description}
            </Text>
            <TextInput
                style={{
                    backgroundColor: "#1E1F22",
                    color: "#DBDEE1",
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 14,
                }}
                placeholder="123456789, 987654321..."
                placeholderTextColor="#5C5E66"
                value={storage[storageKey]}
                onChangeText={(value: string) => (storage[storageKey] = value)}
            />
        </View>
    );
};

export default () => {
    useProxy(storage); 

    return (
        <ScrollView style={{ flex: 1 }}>
            <FormSection title="General Settings">
                <StackedSwitchRow
                    label="Spoiler Own Messages"
                    subLabel="Apply spoilers to attachments sent by you."
                    value={storage.spoilerOwn}
                    onValueChange={(v: boolean) => (storage.spoilerOwn = v)}
                />
            </FormSection>

            <FormSection title="ID Filtering">
                <StackedSwitchRow
                    label="Enable Whitelist Mode"
                    subLabel={
                        storage.isWhitelist 
                            ? "Whitelist: ONLY spoiler attachments from the IDs listed below." 
                            : "Blacklist: IGNORE attachments from the IDs listed below."
                    }
                    value={storage.isWhitelist}
                    onValueChange={(v: boolean) => (storage.isWhitelist = v)}
                />
                <FormDivider />
                <IDInputField 
                    title="User IDs" 
                    description="Comma-separated list of user IDs to filter."
                    storageKey="userIds" 
                />
                <IDInputField 
                    title="Channel IDs" 
                    description="Comma-separated list of channel IDs to filter."
                    storageKey="channelIds" 
                />
                <IDInputField 
                    title="Server IDs" 
                    description="Comma-separated list of server (guild) IDs to filter."
                    storageKey="guildIds" 
                />
            </FormSection>
        </ScrollView>
    );
};