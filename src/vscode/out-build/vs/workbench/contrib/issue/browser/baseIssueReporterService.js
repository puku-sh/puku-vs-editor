var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $, isHTMLInputElement, isHTMLTextAreaElement, reset } from '../../../../base/browser/dom.js';
import { createStyleSheet } from '../../../../base/browser/domStylesheets.js';
import { Button, ButtonWithDropdown, unthemedButtonStyles } from '../../../../base/browser/ui/button/button.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Delayer, RunOnceScheduler } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { groupBy } from '../../../../base/common/collections.js';
import { debounce } from '../../../../base/common/decorators.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { isLinuxSnap, isMacintosh } from '../../../../base/common/platform.js';
import { joinPath } from '../../../../base/common/resources.js';
import { escape } from '../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { Action } from '../../../../base/common/actions.js';
import { localize } from '../../../../nls.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { getIconsStyleSheet } from '../../../../platform/theme/browser/iconsStyleSheet.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IIssueFormService } from '../common/issue.js';
import { normalizeGitHubUrl } from '../common/issueReporterUtil.js';
import { IssueReporterModel } from './issueReporterModel.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
const MAX_URL_LENGTH = 7500;
// Github API and issues on web has a limit of 65536. If extension data is too large, we will allow users to downlaod and attach it as a file.
// We round down to be safe.
// ref https://github.com/github/issues/issues/12858
const MAX_EXTENSION_DATA_LENGTH = 60000;
var IssueSource;
(function (IssueSource) {
    IssueSource["VSCode"] = "vscode";
    IssueSource["Extension"] = "extension";
    IssueSource["Marketplace"] = "marketplace";
    IssueSource["Unknown"] = "unknown";
})(IssueSource || (IssueSource = {}));
let BaseIssueReporterService = class BaseIssueReporterService extends Disposable {
    constructor(disableExtensions, data, os, product, window, isWeb, issueFormService, themeService, fileService, fileDialogService, contextMenuService, authenticationService, openerService) {
        super();
        this.disableExtensions = disableExtensions;
        this.data = data;
        this.os = os;
        this.product = product;
        this.window = window;
        this.isWeb = isWeb;
        this.issueFormService = issueFormService;
        this.themeService = themeService;
        this.fileService = fileService;
        this.fileDialogService = fileDialogService;
        this.contextMenuService = contextMenuService;
        this.authenticationService = authenticationService;
        this.openerService = openerService;
        this.receivedSystemInfo = false;
        this.numberOfSearchResultsDisplayed = 0;
        this.receivedPerformanceInfo = false;
        this.shouldQueueSearch = false;
        this.hasBeenSubmitted = false;
        this.openReporter = false;
        this.loadingExtensionData = false;
        this.selectedExtension = '';
        this.delayedSubmit = new Delayer(300);
        this.nonGitHubIssueUrl = false;
        this.needsUpdate = false;
        this.acknowledged = false;
        const targetExtension = data.extensionId ? data.enabledExtensions.find(extension => extension.id.toLocaleLowerCase() === data.extensionId?.toLocaleLowerCase()) : undefined;
        this.issueReporterModel = new IssueReporterModel({
            ...data,
            issueType: data.issueType || 0 /* IssueType.Bug */,
            versionInfo: {
                vscodeVersion: `${product.nameShort} ${!!product.darwinUniversalAssetId ? `${product.version} (Universal)` : product.version} (${product.commit || 'Commit unknown'}, ${product.date || 'Date unknown'})`,
                os: `${this.os.type} ${this.os.arch} ${this.os.release}${isLinuxSnap ? ' snap' : ''}`
            },
            extensionsDisabled: !!this.disableExtensions,
            fileOnExtension: data.extensionId ? !targetExtension?.isBuiltin : undefined,
            selectedExtension: targetExtension
        });
        this._register(this.authenticationService.onDidChangeSessions(async () => {
            const previousAuthState = !!this.data.githubAccessToken;
            let githubAccessToken = '';
            try {
                const githubSessions = await this.authenticationService.getSessions('github');
                const potentialSessions = githubSessions.filter(session => session.scopes.includes('repo'));
                githubAccessToken = potentialSessions[0]?.accessToken;
            }
            catch (e) {
                // Ignore
            }
            this.data.githubAccessToken = githubAccessToken;
            const currentAuthState = !!githubAccessToken;
            if (previousAuthState !== currentAuthState) {
                this.updateButtonStates();
            }
        }));
        const fileOnMarketplace = data.issueSource === IssueSource.Marketplace;
        const fileOnProduct = data.issueSource === IssueSource.VSCode;
        this.issueReporterModel.update({ fileOnMarketplace, fileOnProduct });
        this.createAction = this._register(new Action('issueReporter.create', localize(9160, null), undefined, true, async () => {
            this.delayedSubmit.trigger(async () => {
                this.createIssue(true); // create issue
            });
        }));
        this.previewAction = this._register(new Action('issueReporter.preview', localize(9161, null), undefined, true, async () => {
            this.delayedSubmit.trigger(async () => {
                this.createIssue(false); // preview issue
            });
        }));
        this.privateAction = this._register(new Action('issueReporter.privateCreate', localize(9162, null), undefined, true, async () => {
            this.delayedSubmit.trigger(async () => {
                this.createIssue(true, true); // create private issue
            });
        }));
        const issueTitle = data.issueTitle;
        if (issueTitle) {
            // eslint-disable-next-line no-restricted-syntax
            const issueTitleElement = this.getElementById('issue-title');
            if (issueTitleElement) {
                issueTitleElement.value = issueTitle;
            }
        }
        const issueBody = data.issueBody;
        if (issueBody) {
            // eslint-disable-next-line no-restricted-syntax
            const description = this.getElementById('description');
            if (description) {
                description.value = issueBody;
                this.issueReporterModel.update({ issueDescription: issueBody });
            }
        }
        if (this.window.document.documentElement.lang !== 'en') {
            // eslint-disable-next-line no-restricted-syntax
            show(this.getElementById('english'));
        }
        const codiconStyleSheet = createStyleSheet();
        codiconStyleSheet.id = 'codiconStyles';
        const iconsStyleSheet = this._register(getIconsStyleSheet(this.themeService));
        function updateAll() {
            codiconStyleSheet.textContent = iconsStyleSheet.getCSS();
        }
        const delayer = new RunOnceScheduler(updateAll, 0);
        this._register(iconsStyleSheet.onDidChange(() => delayer.schedule()));
        delayer.schedule();
        this.handleExtensionData(data.enabledExtensions);
        this.setUpTypes();
        // Handle case where extension is pre-selected through the command
        if ((data.data || data.uri) && targetExtension) {
            this.updateExtensionStatus(targetExtension);
        }
        // initialize the reporting button(s)
        // eslint-disable-next-line no-restricted-syntax
        const issueReporterElement = this.getElementById('issue-reporter');
        if (issueReporterElement) {
            this.updateButtonStates();
        }
    }
    render() {
        this.renderBlocks();
    }
    setInitialFocus() {
        const { fileOnExtension } = this.issueReporterModel.getData();
        if (fileOnExtension) {
            // eslint-disable-next-line no-restricted-syntax
            const issueTitle = this.window.document.getElementById('issue-title');
            issueTitle?.focus();
        }
        else {
            // eslint-disable-next-line no-restricted-syntax
            const issueType = this.window.document.getElementById('issue-type');
            issueType?.focus();
        }
    }
    updateButtonStates() {
        // eslint-disable-next-line no-restricted-syntax
        const issueReporterElement = this.getElementById('issue-reporter');
        if (!issueReporterElement) {
            // shouldn't occur -- throw?
            return;
        }
        // public elements section
        // eslint-disable-next-line no-restricted-syntax
        let publicElements = this.getElementById('public-elements');
        if (!publicElements) {
            publicElements = document.createElement('div');
            publicElements.id = 'public-elements';
            publicElements.classList.add('public-elements');
            issueReporterElement.appendChild(publicElements);
        }
        this.updatePublicGithubButton(publicElements);
        this.updatePublicRepoLink(publicElements);
        // private filing section
        // eslint-disable-next-line no-restricted-syntax
        let internalElements = this.getElementById('internal-elements');
        if (!internalElements) {
            internalElements = document.createElement('div');
            internalElements.id = 'internal-elements';
            internalElements.classList.add('internal-elements');
            internalElements.classList.add('hidden');
            issueReporterElement.appendChild(internalElements);
        }
        // eslint-disable-next-line no-restricted-syntax
        let filingRow = this.getElementById('internal-top-row');
        if (!filingRow) {
            filingRow = document.createElement('div');
            filingRow.id = 'internal-top-row';
            filingRow.classList.add('internal-top-row');
            internalElements.appendChild(filingRow);
        }
        this.updateInternalFilingNote(filingRow);
        this.updateInternalGithubButton(filingRow);
        this.updateInternalElementsVisibility();
    }
    updateInternalFilingNote(container) {
        // eslint-disable-next-line no-restricted-syntax
        let filingNote = this.getElementById('internal-preview-message');
        if (!filingNote) {
            filingNote = document.createElement('span');
            filingNote.id = 'internal-preview-message';
            filingNote.classList.add('internal-preview-message');
            container.appendChild(filingNote);
        }
        filingNote.textContent = escape(localize(9163, null));
    }
    updatePublicGithubButton(container) {
        // eslint-disable-next-line no-restricted-syntax
        const issueReporterElement = this.getElementById('issue-reporter');
        if (!issueReporterElement) {
            return;
        }
        // Dispose of the existing button
        if (this.publicGithubButton) {
            this.publicGithubButton.dispose();
        }
        // setup button + dropdown if applicable
        if (!this.acknowledged && this.needsUpdate) { // * old version and hasn't ack'd
            this.publicGithubButton = this._register(new Button(container, unthemedButtonStyles));
            this.publicGithubButton.label = localize(9164, null);
            this.publicGithubButton.enabled = false;
        }
        else if (this.data.githubAccessToken && this.isPreviewEnabled()) { // * has access token, create by default, preview dropdown
            this.publicGithubButton = this._register(new ButtonWithDropdown(container, {
                contextMenuProvider: this.contextMenuService,
                actions: [this.previewAction],
                addPrimaryActionToDropdown: false,
                ...unthemedButtonStyles
            }));
            this._register(this.publicGithubButton.onDidClick(() => {
                this.createAction.run();
            }));
            this.publicGithubButton.label = localize(9165, null);
            this.publicGithubButton.enabled = true;
        }
        else if (this.data.githubAccessToken && !this.isPreviewEnabled()) { // * Access token but invalid preview state: simple Button (create only)
            this.publicGithubButton = this._register(new Button(container, unthemedButtonStyles));
            this._register(this.publicGithubButton.onDidClick(() => {
                this.createAction.run();
            }));
            this.publicGithubButton.label = localize(9166, null);
            this.publicGithubButton.enabled = true;
        }
        else { // * No access token: simple Button (preview only)
            this.publicGithubButton = this._register(new Button(container, unthemedButtonStyles));
            this._register(this.publicGithubButton.onDidClick(() => {
                this.previewAction.run();
            }));
            this.publicGithubButton.label = localize(9167, null);
            this.publicGithubButton.enabled = true;
        }
        // make sure that the repo link is after the button
        // eslint-disable-next-line no-restricted-syntax
        const repoLink = this.getElementById('show-repo-name');
        if (repoLink) {
            container.insertBefore(this.publicGithubButton.element, repoLink);
        }
    }
    updatePublicRepoLink(container) {
        // eslint-disable-next-line no-restricted-syntax
        let issueRepoName = this.getElementById('show-repo-name');
        if (!issueRepoName) {
            issueRepoName = document.createElement('a');
            issueRepoName.id = 'show-repo-name';
            issueRepoName.classList.add('hidden');
            container.appendChild(issueRepoName);
        }
        const selectedExtension = this.issueReporterModel.getData().selectedExtension;
        if (selectedExtension && selectedExtension.uri) {
            const urlString = URI.revive(selectedExtension.uri).toString();
            issueRepoName.href = urlString;
            issueRepoName.addEventListener('click', (e) => this.openLink(e));
            issueRepoName.addEventListener('auxclick', (e) => this.openLink(e));
            const gitHubInfo = this.parseGitHubUrl(urlString);
            issueRepoName.textContent = gitHubInfo ? gitHubInfo.owner + '/' + gitHubInfo.repositoryName : urlString;
            Object.assign(issueRepoName.style, {
                alignSelf: 'flex-end',
                display: 'block',
                fontSize: '13px',
                padding: '4px 0px',
                textDecoration: 'none',
                width: 'auto'
            });
            show(issueRepoName);
        }
        else if (issueRepoName) {
            // clear styles
            issueRepoName.removeAttribute('style');
            hide(issueRepoName);
        }
    }
    updateInternalGithubButton(container) {
        // eslint-disable-next-line no-restricted-syntax
        const issueReporterElement = this.getElementById('issue-reporter');
        if (!issueReporterElement) {
            return;
        }
        // Dispose of the existing button
        if (this.internalGithubButton) {
            this.internalGithubButton.dispose();
        }
        if (this.data.githubAccessToken && this.data.privateUri) {
            this.internalGithubButton = this._register(new Button(container, unthemedButtonStyles));
            this._register(this.internalGithubButton.onDidClick(() => {
                this.privateAction.run();
            }));
            this.internalGithubButton.element.id = 'internal-create-btn';
            this.internalGithubButton.element.classList.add('internal-create-subtle');
            this.internalGithubButton.label = localize(9168, null);
            this.internalGithubButton.enabled = true;
            this.internalGithubButton.setTitle(this.data.privateUri.path.slice(1));
        }
    }
    updateInternalElementsVisibility() {
        // eslint-disable-next-line no-restricted-syntax
        const container = this.getElementById('internal-elements');
        if (!container) {
            // shouldn't happen
            return;
        }
        if (this.data.githubAccessToken && this.data.privateUri) {
            show(container);
            container.style.display = ''; //todo: necessary even with show?
            if (this.internalGithubButton) {
                this.internalGithubButton.enabled = this.publicGithubButton?.enabled ?? false;
            }
        }
        else {
            hide(container);
            container.style.display = 'none'; //todo: necessary even with hide?
        }
    }
    async updateIssueReporterUri(extension) {
        try {
            if (extension.uri) {
                const uri = URI.revive(extension.uri);
                extension.bugsUrl = uri.toString();
            }
        }
        catch (e) {
            this.renderBlocks();
        }
    }
    handleExtensionData(extensions) {
        const installedExtensions = extensions.filter(x => !x.isBuiltin);
        const { nonThemes, themes } = groupBy(installedExtensions, ext => {
            return ext.isTheme ? 'themes' : 'nonThemes';
        });
        const numberOfThemeExtesions = (themes && themes.length) ?? 0;
        this.issueReporterModel.update({ numberOfThemeExtesions, enabledNonThemeExtesions: nonThemes, allExtensions: installedExtensions });
        this.updateExtensionTable(nonThemes ?? [], numberOfThemeExtesions);
        if (this.disableExtensions || installedExtensions.length === 0) {
            // eslint-disable-next-line no-restricted-syntax
            this.getElementById('disableExtensions').disabled = true;
        }
        this.updateExtensionSelector(installedExtensions);
    }
    updateExtensionSelector(extensions) {
        const extensionOptions = extensions.map(extension => {
            return {
                name: extension.displayName || extension.name || '',
                id: extension.id
            };
        });
        // Sort extensions by name
        extensionOptions.sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();
            if (aName > bName) {
                return 1;
            }
            if (aName < bName) {
                return -1;
            }
            return 0;
        });
        const makeOption = (extension, selectedExtension) => {
            const selected = selectedExtension && extension.id === selectedExtension.id;
            return $('option', {
                'value': extension.id,
                'selected': selected || ''
            }, extension.name);
        };
        // eslint-disable-next-line no-restricted-syntax
        const extensionsSelector = this.getElementById('extension-selector');
        if (extensionsSelector) {
            const { selectedExtension } = this.issueReporterModel.getData();
            reset(extensionsSelector, this.makeOption('', localize(9169, null), true), ...extensionOptions.map(extension => makeOption(extension, selectedExtension)));
            if (!selectedExtension) {
                extensionsSelector.selectedIndex = 0;
            }
            this.addEventListener('extension-selector', 'change', async (e) => {
                this.clearExtensionData();
                const selectedExtensionId = e.target.value;
                this.selectedExtension = selectedExtensionId;
                const extensions = this.issueReporterModel.getData().allExtensions;
                const matches = extensions.filter(extension => extension.id === selectedExtensionId);
                if (matches.length) {
                    this.issueReporterModel.update({ selectedExtension: matches[0] });
                    const selectedExtension = this.issueReporterModel.getData().selectedExtension;
                    if (selectedExtension) {
                        const iconElement = document.createElement('span');
                        iconElement.classList.add(...ThemeIcon.asClassNameArray(Codicon.loading), 'codicon-modifier-spin');
                        this.setLoading(iconElement);
                        const openReporterData = await this.sendReporterMenu(selectedExtension);
                        if (openReporterData) {
                            if (this.selectedExtension === selectedExtensionId) {
                                this.removeLoading(iconElement, true);
                                this.data = openReporterData;
                            }
                        }
                        else {
                            if (!this.loadingExtensionData) {
                                iconElement.classList.remove(...ThemeIcon.asClassNameArray(Codicon.loading), 'codicon-modifier-spin');
                            }
                            this.removeLoading(iconElement);
                            // if not using command, should have no configuration data in fields we care about and check later.
                            this.clearExtensionData();
                            // case when previous extension was opened from normal openIssueReporter command
                            selectedExtension.data = undefined;
                            selectedExtension.uri = undefined;
                        }
                        if (this.selectedExtension === selectedExtensionId) {
                            // repopulates the fields with the new data given the selected extension.
                            this.updateExtensionStatus(matches[0]);
                            this.openReporter = false;
                        }
                    }
                    else {
                        this.issueReporterModel.update({ selectedExtension: undefined });
                        this.clearSearchResults();
                        this.clearExtensionData();
                        this.validateSelectedExtension();
                        this.updateExtensionStatus(matches[0]);
                    }
                }
                // Update internal action visibility after explicit selection
                this.updateInternalElementsVisibility();
            });
        }
        this.addEventListener('problem-source', 'change', (_) => {
            this.clearExtensionData();
            this.validateSelectedExtension();
        });
    }
    async sendReporterMenu(extension) {
        try {
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('sendReporterMenu timed out')), 10000));
            const data = await Promise.race([
                this.issueFormService.sendReporterMenu(extension.id),
                timeoutPromise
            ]);
            return data;
        }
        catch (e) {
            console.error(e);
            return undefined;
        }
    }
    updateAcknowledgementState() {
        // eslint-disable-next-line no-restricted-syntax
        const acknowledgementCheckbox = this.getElementById('includeAcknowledgement');
        if (acknowledgementCheckbox) {
            this.acknowledged = acknowledgementCheckbox.checked;
            this.updateButtonStates();
        }
    }
    setEventHandlers() {
        ['includeSystemInfo', 'includeProcessInfo', 'includeWorkspaceInfo', 'includeExtensions', 'includeExperiments', 'includeExtensionData'].forEach(elementId => {
            this.addEventListener(elementId, 'click', (event) => {
                event.stopPropagation();
                this.issueReporterModel.update({ [elementId]: !this.issueReporterModel.getData()[elementId] });
            });
        });
        this.addEventListener('includeAcknowledgement', 'click', (event) => {
            event.stopPropagation();
            this.updateAcknowledgementState();
        });
        // eslint-disable-next-line no-restricted-syntax
        const showInfoElements = this.window.document.getElementsByClassName('showInfo');
        for (let i = 0; i < showInfoElements.length; i++) {
            const showInfo = showInfoElements.item(i);
            showInfo.addEventListener('click', (e) => {
                e.preventDefault();
                const label = e.target;
                if (label) {
                    const containingElement = label.parentElement && label.parentElement.parentElement;
                    const info = containingElement && containingElement.lastElementChild;
                    if (info && info.classList.contains('hidden')) {
                        show(info);
                        label.textContent = localize(9170, null);
                    }
                    else {
                        hide(info);
                        label.textContent = localize(9171, null);
                    }
                }
            });
        }
        this.addEventListener('issue-source', 'change', (e) => {
            const value = e.target.value;
            // eslint-disable-next-line no-restricted-syntax
            const problemSourceHelpText = this.getElementById('problem-source-help-text');
            if (value === '') {
                this.issueReporterModel.update({ fileOnExtension: undefined });
                show(problemSourceHelpText);
                this.clearSearchResults();
                this.render();
                return;
            }
            else {
                hide(problemSourceHelpText);
            }
            // eslint-disable-next-line no-restricted-syntax
            const descriptionTextArea = this.getElementById('issue-title');
            if (value === IssueSource.VSCode) {
                descriptionTextArea.placeholder = localize(9172, null);
            }
            else if (value === IssueSource.Extension) {
                descriptionTextArea.placeholder = localize(9173, null);
            }
            else if (value === IssueSource.Marketplace) {
                descriptionTextArea.placeholder = localize(9174, null);
            }
            else {
                descriptionTextArea.placeholder = localize(9175, null);
            }
            let fileOnExtension, fileOnMarketplace, fileOnProduct = false;
            if (value === IssueSource.Extension) {
                fileOnExtension = true;
            }
            else if (value === IssueSource.Marketplace) {
                fileOnMarketplace = true;
            }
            else if (value === IssueSource.VSCode) {
                fileOnProduct = true;
            }
            this.issueReporterModel.update({ fileOnExtension, fileOnMarketplace, fileOnProduct });
            this.render();
            // eslint-disable-next-line no-restricted-syntax
            const title = this.getElementById('issue-title').value;
            this.searchIssues(title, fileOnExtension, fileOnMarketplace);
        });
        this.addEventListener('description', 'input', (e) => {
            const issueDescription = e.target.value;
            this.issueReporterModel.update({ issueDescription });
            // Only search for extension issues on title change
            if (this.issueReporterModel.fileOnExtension() === false) {
                // eslint-disable-next-line no-restricted-syntax
                const title = this.getElementById('issue-title').value;
                this.searchVSCodeIssues(title, issueDescription);
            }
        });
        this.addEventListener('issue-title', 'input', _ => {
            // eslint-disable-next-line no-restricted-syntax
            const titleElement = this.getElementById('issue-title');
            if (titleElement) {
                const title = titleElement.value;
                this.issueReporterModel.update({ issueTitle: title });
            }
        });
        this.addEventListener('issue-title', 'input', (e) => {
            const title = e.target.value;
            // eslint-disable-next-line no-restricted-syntax
            const lengthValidationMessage = this.getElementById('issue-title-length-validation-error');
            const issueUrl = this.getIssueUrl();
            if (title && this.getIssueUrlWithTitle(title, issueUrl).length > MAX_URL_LENGTH) {
                show(lengthValidationMessage);
            }
            else {
                hide(lengthValidationMessage);
            }
            // eslint-disable-next-line no-restricted-syntax
            const issueSource = this.getElementById('issue-source');
            if (!issueSource || issueSource.value === '') {
                return;
            }
            const { fileOnExtension, fileOnMarketplace } = this.issueReporterModel.getData();
            this.searchIssues(title, fileOnExtension, fileOnMarketplace);
        });
        // We handle clicks in the dropdown actions now
        this.addEventListener('disableExtensions', 'click', () => {
            this.issueFormService.reloadWithExtensionsDisabled();
        });
        this.addEventListener('extensionBugsLink', 'click', (e) => {
            const url = e.target.innerText;
            this.openLink(url);
        });
        this.addEventListener('disableExtensions', 'keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter' || e.key === ' ') {
                this.issueFormService.reloadWithExtensionsDisabled();
            }
        });
        this.window.document.onkeydown = async (e) => {
            const cmdOrCtrlKey = isMacintosh ? e.metaKey : e.ctrlKey;
            // Cmd/Ctrl+Enter previews issue and closes window
            if (cmdOrCtrlKey && e.key === 'Enter') {
                this.delayedSubmit.trigger(async () => {
                    if (await this.createIssue()) {
                        this.close();
                    }
                });
            }
            // Cmd/Ctrl + w closes issue window
            if (cmdOrCtrlKey && e.key === 'w') {
                e.stopPropagation();
                e.preventDefault();
                // eslint-disable-next-line no-restricted-syntax
                const issueTitle = this.getElementById('issue-title').value;
                const { issueDescription } = this.issueReporterModel.getData();
                if (!this.hasBeenSubmitted && (issueTitle || issueDescription)) {
                    // fire and forget
                    this.issueFormService.showConfirmCloseDialog();
                }
                else {
                    this.close();
                }
            }
            // With latest electron upgrade, cmd+a is no longer propagating correctly for inputs in this window on mac
            // Manually perform the selection
            if (isMacintosh) {
                if (cmdOrCtrlKey && e.key === 'a' && e.target) {
                    if (isHTMLInputElement(e.target) || isHTMLTextAreaElement(e.target)) {
                        e.target.select();
                    }
                }
            }
        };
        // Handle the guidance link specifically to use openerService
        this.addEventListener('review-guidance-help-text', 'click', (e) => {
            const target = e.target;
            if (target.tagName === 'A' && target.getAttribute('target') === '_blank') {
                this.openLink(e);
            }
        });
    }
    updatePerformanceInfo(info) {
        this.issueReporterModel.update(info);
        this.receivedPerformanceInfo = true;
        const state = this.issueReporterModel.getData();
        this.updateProcessInfo(state);
        this.updateWorkspaceInfo(state);
        this.updateButtonStates();
    }
    isPreviewEnabled() {
        const issueType = this.issueReporterModel.getData().issueType;
        if (this.loadingExtensionData) {
            return false;
        }
        if (this.isWeb) {
            if (issueType === 2 /* IssueType.FeatureRequest */ || issueType === 1 /* IssueType.PerformanceIssue */ || issueType === 0 /* IssueType.Bug */) {
                return true;
            }
        }
        else {
            if (issueType === 0 /* IssueType.Bug */ && this.receivedSystemInfo) {
                return true;
            }
            if (issueType === 1 /* IssueType.PerformanceIssue */ && this.receivedSystemInfo && this.receivedPerformanceInfo) {
                return true;
            }
            if (issueType === 2 /* IssueType.FeatureRequest */) {
                return true;
            }
        }
        return false;
    }
    getExtensionRepositoryUrl() {
        const selectedExtension = this.issueReporterModel.getData().selectedExtension;
        return selectedExtension && selectedExtension.repositoryUrl;
    }
    getExtensionBugsUrl() {
        const selectedExtension = this.issueReporterModel.getData().selectedExtension;
        return selectedExtension && selectedExtension.bugsUrl;
    }
    searchVSCodeIssues(title, issueDescription) {
        if (title) {
            this.searchDuplicates(title, issueDescription);
        }
        else {
            this.clearSearchResults();
        }
    }
    searchIssues(title, fileOnExtension, fileOnMarketplace) {
        if (fileOnExtension) {
            return this.searchExtensionIssues(title);
        }
        if (fileOnMarketplace) {
            return this.searchMarketplaceIssues(title);
        }
        const description = this.issueReporterModel.getData().issueDescription;
        this.searchVSCodeIssues(title, description);
    }
    searchExtensionIssues(title) {
        const url = this.getExtensionGitHubUrl();
        if (title) {
            const matches = /^https?:\/\/github\.com\/(.*)/.exec(url);
            if (matches && matches.length) {
                const repo = matches[1];
                return this.searchGitHub(repo, title);
            }
            // If the extension has no repository, display empty search results
            if (this.issueReporterModel.getData().selectedExtension) {
                this.clearSearchResults();
                return this.displaySearchResults([]);
            }
        }
        this.clearSearchResults();
    }
    searchMarketplaceIssues(title) {
        if (title) {
            const gitHubInfo = this.parseGitHubUrl(this.product.reportMarketplaceIssueUrl);
            if (gitHubInfo) {
                return this.searchGitHub(`${gitHubInfo.owner}/${gitHubInfo.repositoryName}`, title);
            }
        }
    }
    async close() {
        await this.issueFormService.closeReporter();
    }
    clearSearchResults() {
        // eslint-disable-next-line no-restricted-syntax
        const similarIssues = this.getElementById('similar-issues');
        similarIssues.innerText = '';
        this.numberOfSearchResultsDisplayed = 0;
    }
    searchGitHub(repo, title) {
        const query = `is:issue+repo:${repo}+${title}`;
        // eslint-disable-next-line no-restricted-syntax
        const similarIssues = this.getElementById('similar-issues');
        fetch(`https://api.github.com/search/issues?q=${query}`).then((response) => {
            response.json().then(result => {
                similarIssues.innerText = '';
                if (result && result.items) {
                    this.displaySearchResults(result.items);
                }
            }).catch(_ => {
                console.warn('Timeout or query limit exceeded');
            });
        }).catch(_ => {
            console.warn('Error fetching GitHub issues');
        });
    }
    searchDuplicates(title, body) {
        const url = 'https://vscode-probot.westus.cloudapp.azure.com:7890/duplicate_candidates';
        const init = {
            method: 'POST',
            body: JSON.stringify({
                title,
                body
            }),
            headers: new Headers({
                'Content-Type': 'application/json'
            })
        };
        fetch(url, init).then((response) => {
            response.json().then(result => {
                this.clearSearchResults();
                if (result && result.candidates) {
                    this.displaySearchResults(result.candidates);
                }
                else {
                    throw new Error('Unexpected response, no candidates property');
                }
            }).catch(_ => {
                // Ignore
            });
        }).catch(_ => {
            // Ignore
        });
    }
    displaySearchResults(results) {
        // eslint-disable-next-line no-restricted-syntax
        const similarIssues = this.getElementById('similar-issues');
        if (results.length) {
            const issues = $('div.issues-container');
            const issuesText = $('div.list-title');
            issuesText.textContent = localize(9176, null);
            this.numberOfSearchResultsDisplayed = results.length < 5 ? results.length : 5;
            for (let i = 0; i < this.numberOfSearchResultsDisplayed; i++) {
                const issue = results[i];
                const link = $('a.issue-link', { href: issue.html_url });
                link.textContent = issue.title;
                link.title = issue.title;
                link.addEventListener('click', (e) => this.openLink(e));
                link.addEventListener('auxclick', (e) => this.openLink(e));
                let issueState;
                let item;
                if (issue.state) {
                    issueState = $('span.issue-state');
                    const issueIcon = $('span.issue-icon');
                    issueIcon.appendChild(renderIcon(issue.state === 'open' ? Codicon.issueOpened : Codicon.issueClosed));
                    const issueStateLabel = $('span.issue-state.label');
                    issueStateLabel.textContent = issue.state === 'open' ? localize(9177, null) : localize(9178, null);
                    issueState.title = issue.state === 'open' ? localize(9179, null) : localize(9180, null);
                    issueState.appendChild(issueIcon);
                    issueState.appendChild(issueStateLabel);
                    item = $('div.issue', undefined, issueState, link);
                }
                else {
                    item = $('div.issue', undefined, link);
                }
                issues.appendChild(item);
            }
            similarIssues.appendChild(issuesText);
            similarIssues.appendChild(issues);
        }
    }
    setUpTypes() {
        const makeOption = (issueType, description) => $('option', { 'value': issueType.valueOf() }, escape(description));
        // eslint-disable-next-line no-restricted-syntax
        const typeSelect = this.getElementById('issue-type');
        const { issueType } = this.issueReporterModel.getData();
        reset(typeSelect, makeOption(0 /* IssueType.Bug */, localize(9181, null)), makeOption(2 /* IssueType.FeatureRequest */, localize(9182, null)), makeOption(1 /* IssueType.PerformanceIssue */, localize(9183, null)));
        typeSelect.value = issueType.toString();
        this.setSourceOptions();
    }
    makeOption(value, description, disabled) {
        const option = document.createElement('option');
        option.disabled = disabled;
        option.value = value;
        option.textContent = description;
        return option;
    }
    setSourceOptions() {
        // eslint-disable-next-line no-restricted-syntax
        const sourceSelect = this.getElementById('issue-source');
        const { issueType, fileOnExtension, selectedExtension, fileOnMarketplace, fileOnProduct } = this.issueReporterModel.getData();
        let selected = sourceSelect.selectedIndex;
        if (selected === -1) {
            if (fileOnExtension !== undefined) {
                selected = fileOnExtension ? 2 : 1;
            }
            else if (selectedExtension?.isBuiltin) {
                selected = 1;
            }
            else if (fileOnMarketplace) {
                selected = 3;
            }
            else if (fileOnProduct) {
                selected = 1;
            }
        }
        sourceSelect.innerText = '';
        sourceSelect.append(this.makeOption('', localize(9184, null), true));
        sourceSelect.append(this.makeOption(IssueSource.VSCode, localize(9185, null), false));
        sourceSelect.append(this.makeOption(IssueSource.Extension, localize(9186, null), false));
        if (this.product.reportMarketplaceIssueUrl) {
            sourceSelect.append(this.makeOption(IssueSource.Marketplace, localize(9187, null), false));
        }
        if (issueType !== 2 /* IssueType.FeatureRequest */) {
            sourceSelect.append(this.makeOption(IssueSource.Unknown, localize(9188, null), false));
        }
        if (selected !== -1 && selected < sourceSelect.options.length) {
            sourceSelect.selectedIndex = selected;
        }
        else {
            sourceSelect.selectedIndex = 0;
            // eslint-disable-next-line no-restricted-syntax
            hide(this.getElementById('problem-source-help-text'));
        }
    }
    async renderBlocks() {
        // Depending on Issue Type, we render different blocks and text
        const { issueType, fileOnExtension, fileOnMarketplace, selectedExtension } = this.issueReporterModel.getData();
        // eslint-disable-next-line no-restricted-syntax
        const blockContainer = this.getElementById('block-container');
        // eslint-disable-next-line no-restricted-syntax
        const systemBlock = this.window.document.querySelector('.block-system');
        // eslint-disable-next-line no-restricted-syntax
        const processBlock = this.window.document.querySelector('.block-process');
        // eslint-disable-next-line no-restricted-syntax
        const workspaceBlock = this.window.document.querySelector('.block-workspace');
        // eslint-disable-next-line no-restricted-syntax
        const extensionsBlock = this.window.document.querySelector('.block-extensions');
        // eslint-disable-next-line no-restricted-syntax
        const experimentsBlock = this.window.document.querySelector('.block-experiments');
        // eslint-disable-next-line no-restricted-syntax
        const extensionDataBlock = this.window.document.querySelector('.block-extension-data');
        // eslint-disable-next-line no-restricted-syntax
        const problemSource = this.getElementById('problem-source');
        // eslint-disable-next-line no-restricted-syntax
        const descriptionTitle = this.getElementById('issue-description-label');
        // eslint-disable-next-line no-restricted-syntax
        const descriptionSubtitle = this.getElementById('issue-description-subtitle');
        // eslint-disable-next-line no-restricted-syntax
        const extensionSelector = this.getElementById('extension-selection');
        // eslint-disable-next-line no-restricted-syntax
        const downloadExtensionDataLink = this.getElementById('extension-data-download');
        // eslint-disable-next-line no-restricted-syntax
        const titleTextArea = this.getElementById('issue-title-container');
        // eslint-disable-next-line no-restricted-syntax
        const descriptionTextArea = this.getElementById('description');
        // eslint-disable-next-line no-restricted-syntax
        const extensionDataTextArea = this.getElementById('extension-data');
        // Hide all by default
        hide(blockContainer);
        hide(systemBlock);
        hide(processBlock);
        hide(workspaceBlock);
        hide(extensionsBlock);
        hide(experimentsBlock);
        hide(extensionSelector);
        hide(extensionDataTextArea);
        hide(extensionDataBlock);
        hide(downloadExtensionDataLink);
        show(problemSource);
        show(titleTextArea);
        show(descriptionTextArea);
        if (fileOnExtension) {
            show(extensionSelector);
        }
        const extensionData = this.issueReporterModel.getData().extensionData;
        if (extensionData && extensionData.length > MAX_EXTENSION_DATA_LENGTH) {
            show(downloadExtensionDataLink);
            const date = new Date();
            const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
            const formattedTime = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
            const fileName = `extensionData_${formattedDate}_${formattedTime}.md`;
            const handleLinkClick = async () => {
                const downloadPath = await this.fileDialogService.showSaveDialog({
                    title: localize(9189, null),
                    availableFileSystems: [Schemas.file],
                    defaultUri: joinPath(await this.fileDialogService.defaultFilePath(Schemas.file), fileName),
                });
                if (downloadPath) {
                    await this.fileService.writeFile(downloadPath, VSBuffer.fromString(extensionData));
                }
            };
            downloadExtensionDataLink.addEventListener('click', handleLinkClick);
            this._register({
                dispose: () => downloadExtensionDataLink.removeEventListener('click', handleLinkClick)
            });
        }
        if (selectedExtension && this.nonGitHubIssueUrl) {
            hide(titleTextArea);
            hide(descriptionTextArea);
            reset(descriptionTitle, localize(9190, null));
            reset(descriptionSubtitle, localize(9191, null, selectedExtension.displayName));
            this.publicGithubButton.label = localize(9192, null);
            return;
        }
        if (fileOnExtension && selectedExtension?.data) {
            const data = selectedExtension?.data;
            extensionDataTextArea.innerText = data.toString();
            extensionDataTextArea.readOnly = true;
            show(extensionDataBlock);
        }
        // only if we know comes from the open reporter command
        if (fileOnExtension && this.openReporter) {
            extensionDataTextArea.readOnly = true;
            setTimeout(() => {
                // delay to make sure from command or not
                if (this.openReporter) {
                    show(extensionDataBlock);
                }
            }, 100);
            show(extensionDataBlock);
        }
        if (issueType === 0 /* IssueType.Bug */) {
            if (!fileOnMarketplace) {
                show(blockContainer);
                show(systemBlock);
                show(experimentsBlock);
                if (!fileOnExtension) {
                    show(extensionsBlock);
                }
            }
            reset(descriptionTitle, localize(9193, null) + ' ', $('span.required-input', undefined, '*'));
            reset(descriptionSubtitle, localize(9194, null));
        }
        else if (issueType === 1 /* IssueType.PerformanceIssue */) {
            if (!fileOnMarketplace) {
                show(blockContainer);
                show(systemBlock);
                show(processBlock);
                show(workspaceBlock);
                show(experimentsBlock);
            }
            if (fileOnExtension) {
                show(extensionSelector);
            }
            else if (!fileOnMarketplace) {
                show(extensionsBlock);
            }
            reset(descriptionTitle, localize(9195, null) + ' ', $('span.required-input', undefined, '*'));
            reset(descriptionSubtitle, localize(9196, null));
        }
        else if (issueType === 2 /* IssueType.FeatureRequest */) {
            reset(descriptionTitle, localize(9197, null) + ' ', $('span.required-input', undefined, '*'));
            reset(descriptionSubtitle, localize(9198, null));
        }
    }
    validateInput(inputId) {
        // eslint-disable-next-line no-restricted-syntax
        const inputElement = this.getElementById(inputId);
        // eslint-disable-next-line no-restricted-syntax
        const inputValidationMessage = this.getElementById(`${inputId}-empty-error`);
        // eslint-disable-next-line no-restricted-syntax
        const descriptionShortMessage = this.getElementById(`description-short-error`);
        if (inputId === 'description' && this.nonGitHubIssueUrl && this.data.extensionId) {
            return true;
        }
        else if (!inputElement.value) {
            inputElement.classList.add('invalid-input');
            inputValidationMessage?.classList.remove('hidden');
            descriptionShortMessage?.classList.add('hidden');
            return false;
        }
        else if (inputId === 'description' && inputElement.value.length < 10) {
            inputElement.classList.add('invalid-input');
            descriptionShortMessage?.classList.remove('hidden');
            inputValidationMessage?.classList.add('hidden');
            return false;
        }
        else {
            inputElement.classList.remove('invalid-input');
            inputValidationMessage?.classList.add('hidden');
            if (inputId === 'description') {
                descriptionShortMessage?.classList.add('hidden');
            }
            return true;
        }
    }
    validateInputs() {
        let isValid = true;
        ['issue-title', 'description', 'issue-source'].forEach(elementId => {
            isValid = this.validateInput(elementId) && isValid;
        });
        if (this.issueReporterModel.fileOnExtension()) {
            isValid = this.validateInput('extension-selector') && isValid;
        }
        return isValid;
    }
    async submitToGitHub(issueTitle, issueBody, gitHubDetails) {
        const url = `https://api.github.com/repos/${gitHubDetails.owner}/${gitHubDetails.repositoryName}/issues`;
        const init = {
            method: 'POST',
            body: JSON.stringify({
                title: issueTitle,
                body: issueBody
            }),
            headers: new Headers({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.data.githubAccessToken}`,
                'User-Agent': 'request'
            })
        };
        const response = await fetch(url, init);
        if (!response.ok) {
            console.error('Invalid GitHub URL provided.');
            return false;
        }
        const result = await response.json();
        await this.openLink(result.html_url);
        this.close();
        return true;
    }
    async createIssue(shouldCreate, privateUri) {
        const selectedExtension = this.issueReporterModel.getData().selectedExtension;
        // Short circuit if the extension provides a custom issue handler
        if (this.nonGitHubIssueUrl) {
            const url = this.getExtensionBugsUrl();
            if (url) {
                this.hasBeenSubmitted = true;
                return true;
            }
        }
        if (!this.validateInputs()) {
            // If inputs are invalid, set focus to the first one and add listeners on them
            // to detect further changes
            // eslint-disable-next-line no-restricted-syntax
            const invalidInput = this.window.document.getElementsByClassName('invalid-input');
            if (invalidInput.length) {
                invalidInput[0].focus();
            }
            this.addEventListener('issue-title', 'input', _ => {
                this.validateInput('issue-title');
            });
            this.addEventListener('description', 'input', _ => {
                this.validateInput('description');
            });
            this.addEventListener('issue-source', 'change', _ => {
                this.validateInput('issue-source');
            });
            if (this.issueReporterModel.fileOnExtension()) {
                this.addEventListener('extension-selector', 'change', _ => {
                    this.validateInput('extension-selector');
                });
            }
            return false;
        }
        this.hasBeenSubmitted = true;
        // eslint-disable-next-line no-restricted-syntax
        const issueTitle = this.getElementById('issue-title').value;
        const issueBody = this.issueReporterModel.serialize();
        let issueUrl = privateUri ? this.getPrivateIssueUrl() : this.getIssueUrl();
        if (!issueUrl) {
            console.error(`No ${privateUri ? 'private ' : ''}issue url found`);
            return false;
        }
        if (selectedExtension?.uri) {
            const uri = URI.revive(selectedExtension.uri);
            issueUrl = uri.toString();
        }
        const gitHubDetails = this.parseGitHubUrl(issueUrl);
        if (this.data.githubAccessToken && gitHubDetails && shouldCreate) {
            return this.submitToGitHub(issueTitle, issueBody, gitHubDetails);
        }
        // eslint-disable-next-line no-restricted-syntax
        const baseUrl = this.getIssueUrlWithTitle(this.getElementById('issue-title').value, issueUrl);
        let url = baseUrl + `&body=${encodeURIComponent(issueBody)}`;
        url = this.addTemplateToUrl(url, gitHubDetails?.owner, gitHubDetails?.repositoryName);
        if (url.length > MAX_URL_LENGTH) {
            try {
                url = await this.writeToClipboard(baseUrl, issueBody);
                url = this.addTemplateToUrl(url, gitHubDetails?.owner, gitHubDetails?.repositoryName);
            }
            catch (_) {
                console.error('Writing to clipboard failed');
                return false;
            }
        }
        await this.openLink(url);
        return true;
    }
    async writeToClipboard(baseUrl, issueBody) {
        const shouldWrite = await this.issueFormService.showClipboardDialog();
        if (!shouldWrite) {
            throw new CancellationError();
        }
        return baseUrl + `&body=${encodeURIComponent(localize(9199, null))}`;
    }
    addTemplateToUrl(baseUrl, owner, repositoryName) {
        const isVscode = this.issueReporterModel.getData().fileOnProduct;
        const isMicrosoft = owner?.toLowerCase() === 'microsoft';
        const needsTemplate = isVscode || (isMicrosoft && (repositoryName === 'vscode' || repositoryName === 'vscode-python'));
        if (needsTemplate) {
            try {
                const url = new URL(baseUrl);
                url.searchParams.set('template', 'bug_report.md');
                return url.toString();
            }
            catch {
                // fallback if baseUrl is not a valid URL
                return baseUrl + '&template=bug_report.md';
            }
        }
        return baseUrl;
    }
    getIssueUrl() {
        return this.issueReporterModel.fileOnExtension()
            ? this.getExtensionGitHubUrl()
            : this.issueReporterModel.getData().fileOnMarketplace
                ? this.product.reportMarketplaceIssueUrl
                : this.product.reportIssueUrl;
    }
    // for when command 'workbench.action.openIssueReporter' passes along a
    // `privateUri` UriComponents value
    getPrivateIssueUrl() {
        return URI.revive(this.data.privateUri)?.toString();
    }
    parseGitHubUrl(url) {
        // Assumes a GitHub url to a particular repo, https://github.com/repositoryName/owner.
        // Repository name and owner cannot contain '/'
        const match = /^https?:\/\/github\.com\/([^\/]*)\/([^\/]*).*/.exec(url);
        if (match && match.length) {
            return {
                owner: match[1],
                repositoryName: match[2]
            };
        }
        else {
            console.error('No GitHub issues match');
        }
        return undefined;
    }
    getExtensionGitHubUrl() {
        let repositoryUrl = '';
        const bugsUrl = this.getExtensionBugsUrl();
        const extensionUrl = this.getExtensionRepositoryUrl();
        // If given, try to match the extension's bug url
        if (bugsUrl && bugsUrl.match(/^https?:\/\/github\.com\/([^\/]*)\/([^\/]*)\/?(\/issues)?$/)) {
            // matches exactly: https://github.com/owner/repo/issues
            repositoryUrl = normalizeGitHubUrl(bugsUrl);
        }
        else if (extensionUrl && extensionUrl.match(/^https?:\/\/github\.com\/([^\/]*)\/([^\/]*)$/)) {
            // matches exactly: https://github.com/owner/repo
            repositoryUrl = normalizeGitHubUrl(extensionUrl);
        }
        else {
            this.nonGitHubIssueUrl = true;
            repositoryUrl = bugsUrl || extensionUrl || '';
        }
        return repositoryUrl;
    }
    getIssueUrlWithTitle(issueTitle, repositoryUrl) {
        if (this.issueReporterModel.fileOnExtension()) {
            repositoryUrl = repositoryUrl + '/issues/new';
        }
        const queryStringPrefix = repositoryUrl.indexOf('?') === -1 ? '?' : '&';
        return `${repositoryUrl}${queryStringPrefix}title=${encodeURIComponent(issueTitle)}`;
    }
    clearExtensionData() {
        this.nonGitHubIssueUrl = false;
        this.issueReporterModel.update({ extensionData: undefined });
        this.data.issueBody = this.data.issueBody || '';
        this.data.data = undefined;
        this.data.uri = undefined;
        this.data.privateUri = undefined;
    }
    async updateExtensionStatus(extension) {
        this.issueReporterModel.update({ selectedExtension: extension });
        // uses this.configuuration.data to ensure that data is coming from `openReporter` command.
        const template = this.data.issueBody;
        if (template) {
            // eslint-disable-next-line no-restricted-syntax
            const descriptionTextArea = this.getElementById('description');
            const descriptionText = descriptionTextArea.value;
            if (descriptionText === '' || !descriptionText.includes(template.toString())) {
                const fullTextArea = descriptionText + (descriptionText === '' ? '' : '\n') + template.toString();
                descriptionTextArea.value = fullTextArea;
                this.issueReporterModel.update({ issueDescription: fullTextArea });
            }
        }
        const data = this.data.data;
        if (data) {
            this.issueReporterModel.update({ extensionData: data });
            extension.data = data;
            // eslint-disable-next-line no-restricted-syntax
            const extensionDataBlock = this.window.document.querySelector('.block-extension-data');
            show(extensionDataBlock);
            this.renderBlocks();
        }
        const uri = this.data.uri;
        if (uri) {
            extension.uri = uri;
            this.updateIssueReporterUri(extension);
        }
        this.validateSelectedExtension();
        // eslint-disable-next-line no-restricted-syntax
        const title = this.getElementById('issue-title').value;
        this.searchExtensionIssues(title);
        this.updateButtonStates();
        this.renderBlocks();
    }
    validateSelectedExtension() {
        // eslint-disable-next-line no-restricted-syntax
        const extensionValidationMessage = this.getElementById('extension-selection-validation-error');
        // eslint-disable-next-line no-restricted-syntax
        const extensionValidationNoUrlsMessage = this.getElementById('extension-selection-validation-error-no-url');
        hide(extensionValidationMessage);
        hide(extensionValidationNoUrlsMessage);
        const extension = this.issueReporterModel.getData().selectedExtension;
        if (!extension) {
            this.publicGithubButton.enabled = true;
            return;
        }
        if (this.loadingExtensionData) {
            return;
        }
        const hasValidGitHubUrl = this.getExtensionGitHubUrl();
        if (hasValidGitHubUrl) {
            this.publicGithubButton.enabled = true;
        }
        else {
            this.setExtensionValidationMessage();
            this.publicGithubButton.enabled = false;
        }
    }
    setLoading(element) {
        // Show loading
        this.openReporter = true;
        this.loadingExtensionData = true;
        this.updateButtonStates();
        // eslint-disable-next-line no-restricted-syntax
        const extensionDataCaption = this.getElementById('extension-id');
        hide(extensionDataCaption);
        // eslint-disable-next-line no-restricted-syntax
        const extensionDataCaption2 = Array.from(this.window.document.querySelectorAll('.ext-parens'));
        extensionDataCaption2.forEach(extensionDataCaption2 => hide(extensionDataCaption2));
        // eslint-disable-next-line no-restricted-syntax
        const showLoading = this.getElementById('ext-loading');
        show(showLoading);
        while (showLoading.firstChild) {
            showLoading.firstChild.remove();
        }
        showLoading.append(element);
        this.renderBlocks();
    }
    removeLoading(element, fromReporter = false) {
        this.openReporter = fromReporter;
        this.loadingExtensionData = false;
        this.updateButtonStates();
        // eslint-disable-next-line no-restricted-syntax
        const extensionDataCaption = this.getElementById('extension-id');
        show(extensionDataCaption);
        // eslint-disable-next-line no-restricted-syntax
        const extensionDataCaption2 = Array.from(this.window.document.querySelectorAll('.ext-parens'));
        extensionDataCaption2.forEach(extensionDataCaption2 => show(extensionDataCaption2));
        // eslint-disable-next-line no-restricted-syntax
        const hideLoading = this.getElementById('ext-loading');
        hide(hideLoading);
        if (hideLoading.firstChild) {
            element.remove();
        }
        this.renderBlocks();
    }
    setExtensionValidationMessage() {
        // eslint-disable-next-line no-restricted-syntax
        const extensionValidationMessage = this.getElementById('extension-selection-validation-error');
        // eslint-disable-next-line no-restricted-syntax
        const extensionValidationNoUrlsMessage = this.getElementById('extension-selection-validation-error-no-url');
        const bugsUrl = this.getExtensionBugsUrl();
        if (bugsUrl) {
            show(extensionValidationMessage);
            // eslint-disable-next-line no-restricted-syntax
            const link = this.getElementById('extensionBugsLink');
            link.textContent = bugsUrl;
            return;
        }
        const extensionUrl = this.getExtensionRepositoryUrl();
        if (extensionUrl) {
            show(extensionValidationMessage);
            // eslint-disable-next-line no-restricted-syntax
            const link = this.getElementById('extensionBugsLink');
            link.textContent = extensionUrl;
            return;
        }
        show(extensionValidationNoUrlsMessage);
    }
    updateProcessInfo(state) {
        // eslint-disable-next-line no-restricted-syntax
        const target = this.window.document.querySelector('.block-process .block-info');
        if (target) {
            reset(target, $('code', undefined, state.processInfo ?? ''));
        }
    }
    updateWorkspaceInfo(state) {
        // eslint-disable-next-line no-restricted-syntax
        this.window.document.querySelector('.block-workspace .block-info code').textContent = '\n' + state.workspaceInfo;
    }
    updateExtensionTable(extensions, numThemeExtensions) {
        // eslint-disable-next-line no-restricted-syntax
        const target = this.window.document.querySelector('.block-extensions .block-info');
        if (target) {
            if (this.disableExtensions) {
                reset(target, localize(9200, null));
                return;
            }
            const themeExclusionStr = numThemeExtensions ? `\n(${numThemeExtensions} theme extensions excluded)` : '';
            extensions = extensions || [];
            if (!extensions.length) {
                target.innerText = 'Extensions: none' + themeExclusionStr;
                return;
            }
            reset(target, this.getExtensionTableHtml(extensions), document.createTextNode(themeExclusionStr));
        }
    }
    getExtensionTableHtml(extensions) {
        return $('table', undefined, $('tr', undefined, $('th', undefined, 'Extension'), $('th', undefined, 'Author (truncated)'), $('th', undefined, 'Version')), ...extensions.map(extension => $('tr', undefined, $('td', undefined, extension.name), $('td', undefined, extension.publisher?.substr(0, 3) ?? 'N/A'), $('td', undefined, extension.version))));
    }
    async openLink(eventOrUrl) {
        if (typeof eventOrUrl === 'string') {
            // Direct URL call
            await this.openerService.open(eventOrUrl, { openExternal: true });
        }
        else {
            // MouseEvent call
            const event = eventOrUrl;
            event.preventDefault();
            event.stopPropagation();
            // Exclude right click
            if (event.which < 3) {
                await this.openerService.open(event.target.href, { openExternal: true });
            }
        }
    }
    getElementById(elementId) {
        // eslint-disable-next-line no-restricted-syntax
        const element = this.window.document.getElementById(elementId);
        if (element) {
            return element;
        }
        else {
            return undefined;
        }
    }
    addEventListener(elementId, eventType, handler) {
        // eslint-disable-next-line no-restricted-syntax
        const element = this.getElementById(elementId);
        element?.addEventListener(eventType, handler);
    }
};
__decorate([
    debounce(300)
], BaseIssueReporterService.prototype, "searchGitHub", null);
__decorate([
    debounce(300)
], BaseIssueReporterService.prototype, "searchDuplicates", null);
BaseIssueReporterService = __decorate([
    __param(6, IIssueFormService),
    __param(7, IThemeService),
    __param(8, IFileService),
    __param(9, IFileDialogService),
    __param(10, IContextMenuService),
    __param(11, IAuthenticationService),
    __param(12, IOpenerService)
], BaseIssueReporterService);
export { BaseIssueReporterService };
// helper functions
export function hide(el) {
    el?.classList.add('hidden');
}
export function show(el) {
    el?.classList.remove('hidden');
}
//# sourceMappingURL=baseIssueReporterService.js.map