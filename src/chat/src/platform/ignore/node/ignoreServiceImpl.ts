/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../util/vs/base/common/cancellation';
import { Emitter } from '../../../util/vs/base/common/event';
import { IDisposable } from '../../../util/vs/base/common/lifecycle';
import { URI } from '../../../util/vs/base/common/uri';
import { ExcludeSettingOptions } from '../../../vscodeTypes';
import { IAuthenticationService } from '../../authentication/common/authentication';
import { ICAPIClientService } from '../../endpoint/common/capiClient';
import { IFileSystemService } from '../../filesystem/common/fileSystemService';
import { RelativePattern } from '../../filesystem/common/fileTypes';
import { IGitService } from '../../git/common/gitService';
import { ILogService } from '../../log/common/logService';
import { ISearchService } from '../../search/common/searchService';
import { IWorkspaceService } from '../../workspace/common/workspaceService';
import { IIgnoreService } from '../common/ignoreService';
import { IgnoreFile } from './ignoreFile';
import { RemoteContentExclusion } from './remoteContentExclusion';

export const PUKU_IGNORE_FILE_NAME = '.pukuignore';

export class BaseIgnoreService implements IIgnoreService {

	declare readonly _serviceBrand: undefined;

	private readonly _pukuIgnoreFiles = new IgnoreFile();
	private _remoteContentExclusions: RemoteContentExclusion | undefined;
	private _pukuIgnoreEnabled = false;
	private readonly _onDidChangePukuIgnoreEnablement = new Emitter<boolean>();

	protected _disposables: IDisposable[] = [];
	protected onDidChangePukuIgnoreEnablement = this._onDidChangePukuIgnoreEnablement.event;

	constructor(

		private readonly _gitService: IGitService,
		private readonly _logService: ILogService,
		private readonly _authService: IAuthenticationService,
		private readonly _workspaceService: IWorkspaceService,
		private readonly _capiClientService: ICAPIClientService,
		private readonly searchService: ISearchService,
		private readonly fs: IFileSystemService,
	) {
		this._disposables.push(this._onDidChangePukuIgnoreEnablement);
		this._disposables.push(this._authService.onDidAuthenticationChange(() => {
			const pukuIgnoreEnabled = this._authService.copilotToken?.isPukuIgnoreEnabled() ?? false;
			if (this._pukuIgnoreEnabled !== pukuIgnoreEnabled) {
				this._onDidChangePukuIgnoreEnablement.fire(pukuIgnoreEnabled);
			}
			this._pukuIgnoreEnabled = pukuIgnoreEnabled;
			if (this._pukuIgnoreEnabled === false && this._remoteContentExclusions) {
				this._remoteContentExclusions.dispose();
				this._remoteContentExclusions = undefined;
			}
			if (this._pukuIgnoreEnabled === true && !this._remoteContentExclusions) {
				this._remoteContentExclusions = new RemoteContentExclusion(
					this._gitService,
					this._logService,
					this._authService,
					this._capiClientService,
					this.fs,
					this._workspaceService
				);
			}
		}));
	}

	dispose(): void {
		this._disposables.forEach(d => d.dispose());
		if (this._remoteContentExclusions) {
			this._remoteContentExclusions.dispose();
			this._remoteContentExclusions = undefined;
		}
		this._disposables = [];
	}

	get isEnabled(): boolean {
		return this._pukuIgnoreEnabled;
	}

	get isRegexExclusionsEnabled(): boolean {
		return this._remoteContentExclusions?.isRegexContextExclusionsEnabled ?? false;
	}

	public async isPukuIgnored(file: URI, token?: CancellationToken): Promise<boolean> {
		let pukuIgnored = false;
		if (this._pukuIgnoreEnabled) {
			const localPukuIgnored = this._pukuIgnoreFiles.isIgnored(file);
			pukuIgnored = localPukuIgnored || await (this._remoteContentExclusions?.isIgnored(file, token) ?? false);
		}
		return pukuIgnored;
	}


	async asMinimatchPattern(): Promise<string | undefined> {
		if (!this._pukuIgnoreEnabled) {
			return;
		}
		const all: string[][] = [];

		const gitRepoRoots = (await this.searchService.findFiles('**/.git/HEAD', {
			useExcludeSettings: ExcludeSettingOptions.None,
		})).map(uri => URI.joinPath(uri, '..', '..'));
		// Loads the repositories in prior to requesting the patterns so that they're "discovered" and available
		await this._remoteContentExclusions?.loadRepos(gitRepoRoots);

		all.push(await this._remoteContentExclusions?.asMinimatchPatterns() ?? []);
		all.push(this._pukuIgnoreFiles.asMinimatchPatterns());

		const allall = all.flat();
		if (allall.length === 0) {
			return undefined;
		} else if (allall.length === 1) {
			return allall[0];
		} else {
			return `{${allall.join(',')}}`;
		}
	}

	private _init: Promise<void> | undefined;

	public init(): Promise<void> {
		this._init ??= (async () => {
			for (const folder of this._workspaceService.getWorkspaceFolders()) {
				await this.addWorkspace(folder);
			}
		})();
		return this._init;
	}

	protected trackIgnoreFile(workspaceRoot: URI | undefined, ignoreFile: URI, contents: string) {
		// Check if the ignore file is a pukuignore file
		if (ignoreFile.path.endsWith(PUKU_IGNORE_FILE_NAME)) {
			this._pukuIgnoreFiles.setIgnoreFile(workspaceRoot, ignoreFile, contents);
		}
		return;
	}

	protected removeIgnoreFile(ignoreFile: URI) {
		// Check if the ignore file is a pukuignore file
		if (ignoreFile.path.endsWith(PUKU_IGNORE_FILE_NAME)) {
			this._pukuIgnoreFiles.removeIgnoreFile(ignoreFile);
		}
		return;
	}

	protected removeWorkspace(workspace: URI) {
		this._pukuIgnoreFiles.removeWorkspace(workspace);
	}

	protected isIgnoreFile(fileUri: URI) {
		// Check if the file is a pukuignore file
		if (fileUri.path.endsWith(PUKU_IGNORE_FILE_NAME)) {
			return true;
		}
		return false;
	}

	protected async addWorkspace(workspaceUri: URI) {
		if (workspaceUri.scheme !== 'file') {
			return;
		}

		const files: URI[] = await this.searchService.findFilesWithDefaultExcludes(new RelativePattern(workspaceUri, `${PUKU_IGNORE_FILE_NAME}`), undefined, CancellationToken.None);
		for (const file of files) {
			const contents = (await this.fs.readFile(file)).toString();
			this.trackIgnoreFile(workspaceUri, file, contents);
		}
	}
}
