package com.morocco.calendar.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;
import org.yaml.snakeyaml.Yaml;

import java.io.InputStream;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Service
public class ConfigService {

    private final ResourceLoader resourceLoader;

    @Value("${app.config.file:classpath:config-options.yml}")
    private String configFile;

    public ConfigService(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    public ConfigResponse getConfigOptions() {
        try {
            Resource resource = resourceLoader.getResource(configFile);
            InputStream inputStream = resource.getInputStream();

            Yaml yaml = new Yaml();
            Map<String, Object> data = yaml.load(inputStream);

            @SuppressWarnings("unchecked")
            List<Map<String, String>> options = (List<Map<String, String>>) data.get("configOptions");

            List<ConfigOption> configOptions = options.stream()
                .map(option -> new ConfigOption(option.get("labelKey"), option.get("value")))
                .toList();

            return new ConfigResponse(configOptions);

        } catch (Exception e) {
            throw new RuntimeException("Error loading config options", e);
        }
    }

    public ConfigResponse getDefaultConfig() {
        List<ConfigOption> defaultOptions = Arrays.asList(
            new ConfigOption("config.botolaD1", "schBotolaD1/SchMoroccoD1.properties"),
            new ConfigOption("config.botolaD2", "schBotolaD2/SchMoroccoD2.properties"),
            new ConfigOption("config.cnpff1", "schCNPFF1/MoroccoCNPFF1.properties"),
            new ConfigOption("config.cnpff2", "schCNPFF2/MoroccoCNPFF2.properties")
        );

        return new ConfigResponse(defaultOptions);
    }
}
