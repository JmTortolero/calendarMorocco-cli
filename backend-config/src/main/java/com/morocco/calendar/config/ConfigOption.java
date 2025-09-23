package com.morocco.calendar.config;

public class ConfigOption {
    private String labelKey;
    private String value;

    public ConfigOption() {}

    public ConfigOption(String labelKey, String value) {
        this.labelKey = labelKey;
        this.value = value;
    }

    public String getLabelKey() {
        return labelKey;
    }

    public void setLabelKey(String labelKey) {
        this.labelKey = labelKey;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }
}
