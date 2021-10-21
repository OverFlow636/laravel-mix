const { concat, extend } = require('lodash');
const Dependencies = require('../Dependencies');

/**
 * @typedef {import('../../types/component').ComponentInterface} ComponentInterface
 * @typedef {import('../../types/component').InstallableComponent} InstallableComponent
 * @typedef {import('../../types/component').Component} Component
 **/

/**
 * @template TArgs
 *
 * @typedef {object} ComponentInvocation
 * @property {string} name
 * @property {TArgs} args
 **/

/** @private */
module.exports.ComponentInstance = class ComponentInstance {
    /** @type {'installed' | 'active'} */
    state = 'installed';

    /**
     * @param {import("./BuildGroup").BuildGroup} group
     * @param {ComponentInterface} instance
     */
    constructor(group, instance) {
        this.group = group;
        this.instance = instance;
    }

    /**
     * @internal
     * @param {ComponentInvocation<any[]>} invocation
     * @returns
     */
    run(invocation) {
        const { name, args } = invocation;

        // Legacy support
        if (this.group.name === 'default') {
            this.mix.components.record(name, this.instance);
        }

        this.state = 'active';

        // @ts-ignore
        this.instance.caller = name;

        this.instance.register && this.instance.register(...args);

        // @ts-ignore
        this.instance.activated = true;
    }

    /**
     * @returns
     */
    async collectDeps() {
        if (this.state !== 'active') {
            return;
        }

        /** @type {import('../Dependencies').Dependency[]} */
        const deps = this.instance.dependencies
            ? concat([], await this.instance.dependencies())
            : [];

        Dependencies.queue(deps, this.instance.requiresReload || false);
    }

    /**
     * @returns
     */
    async init() {
        if (this.state !== 'active') {
            return;
        }

        await this.boot();
        await this.applyBabelConfig();

        this.mix.listen('loading-entry', entry => this.applyEntry(entry));
        this.mix.listen('loading-rules', rules => this.applyRules(rules));
        this.mix.listen('loading-plugins', plugins => this.applyPlugins(plugins));
        this.mix.listen('configReady', config => this.applyConfig(config));
    }

    /**
     * Apply the Babel configuration for the component.
     *
     * @private
     */
    async boot() {
        this.instance.boot && (await this.instance.boot());
    }

    /**
     * Apply the Babel configuration for the component.
     *
     * @private
     */
    async applyBabelConfig() {
        const config = this.instance.babelConfig
            ? (await this.instance.babelConfig()) || {}
            : {};

        this.group.context.config.merge({
            babelConfig: extend(this.group.context.config.babelConfig, config)
        });
    }

    /**
     * Apply the Babel configuration for the component.
     *
     * @param {import('../builder/Entry')} entry
     */
    async applyEntry(entry) {
        return this.instance.webpackEntry && this.instance.webpackEntry(entry);
    }

    /**
     * Apply the webpack rules for the component.
     *
     * @param {import('webpack').RuleSetRule[]} rules
     * @private
     */
    async applyRules(rules) {
        const newRules = this.instance.webpackRules
            ? concat((await this.instance.webpackRules()) || [])
            : [];

        rules.push(...newRules);
    }

    /**
     * Apply the webpack plugins for the component.
     *
     * @param {import('webpack').WebpackPluginInstance[]} plugins
     * @private
     */
    async applyPlugins(plugins) {
        const newPlugins = this.instance.webpackPlugins
            ? concat((await this.instance.webpackPlugins()) || [])
            : [];

        plugins.push(...newPlugins);
    }

    /**
     * Apply the webpack plugins for the component.
     *
     * @param {import('webpack').Configuration} config
     * @private
     */
    async applyConfig(config) {
        return this.instance.webpackConfig && this.instance.webpackConfig(config);
    }

    get mix() {
        return this.group.mix;
    }
};
