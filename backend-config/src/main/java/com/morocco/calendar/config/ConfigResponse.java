package com.morocco.calendar.config;

import java.util.List;

public class ConfigResponse {
    private List<ConfigOption> configOptions;

    public ConfigResponse() {}

    public ConfigResponse(List<ConfigOption> configOptions) {
        this.configOptions = configOptions;
    }

    public List<ConfigOption> getConfigOptions() {
        return configOptions;
    }

    public void setConfigOptions(List<ConfigOption> configOptions) {
        this.configOptions = configOptions;
    }
}
