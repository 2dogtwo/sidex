import { Component, DOM, $, formatDuration } from '../base.js';
import { Emitter, Event } from '../../../../../../base/common/event.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { IChatMessage, IToolCallInfo } from '../../sidexChatService.js';
import { renderMarkdown } from '../markdownRenderer.js';
import { Collapsible } from '../collapsible/collapsible.js';
import { FilesExplored } from '../tools/filesExplored.js';
import { StepsPlanned } from '../tools/stepsPlanned.js';
import { ToolCallItem } from '../tools/toolCallItem.js';

export class AssistantMessage extends Component {
	private readonly _onCopy = this._register(new Emitter<string>());
	readonly onCopy: Event<string> = this._onCopy.event;

	constructor(msg: IChatMessage, turnDurationMs?: number, onFileClick?: (path: string) => void) {
		super('div', 'sc-assistant-msg');

		const hasTools = msg.toolCalls && msg.toolCalls.length > 0;

		// Only show "Worked for Xs" collapsible when there are actual tool calls
		if (hasTools && turnDurationMs && turnDurationMs > 500) {
			const activitySection = new Collapsible(
				`Worked for ${formatDuration(turnDurationMs)}`,
				undefined
			);
			activitySection.appendTo(this.element);
			this._register(activitySection);

			for (const tc of msg.toolCalls!) {
				const item = new ToolCallItem(tc);
				item.appendTo(activitySection.body);
				this._register(item);
			}
		}

		// Markdown body
		if (msg.content) {
			const bodyEl = this.append('div', 'sc-assistant-body');
			bodyEl.innerHTML = renderMarkdown(msg.content);
		}

		// Files explored (only if files were actually read)
		const exploredFiles = extractExploredFiles(msg.toolCalls || []);
		if (exploredFiles.length > 0) {
			const filesComp = new FilesExplored(exploredFiles, onFileClick);
			filesComp.appendTo(this.element);
			this._register(filesComp);
		}

		// Steps planned (only if tasks were created)
		const steps = extractSteps(msg.toolCalls || []);
		if (steps.length > 0) {
			const stepsComp = new StepsPlanned(steps);
			stepsComp.appendTo(this.element);
			this._register(stepsComp);
		}

		// Three-dot menu (right side, hover) — uses ellipsis codicon
		const menuBtn = this.append('div', 'sc-msg-menu');
		const dots = DOM.append(menuBtn, $('button.sc-msg-menu-btn'));
		dots.title = 'Copy';
		const dotsIcon = document.createElement('span');
		dotsIcon.classList.add(...ThemeIcon.asClassNameArray(Codicon.ellipsis));
		dots.appendChild(dotsIcon);
		this.on(dots, 'click', () => {
			if (msg.content) {
				navigator.clipboard.writeText(msg.content).catch(() => { /* */ });
				dots.textContent = '✓';
				setTimeout(() => {
					dots.textContent = '';
					dots.appendChild(dotsIcon);
				}, 1200);
			}
		});
	}
}

const READ_TOOLS = new Set([
	'read_file', 'grep', 'glob', 'search_files',
	'batch_read', 'lsp_hover', 'lsp_definition', 'lsp_references',
]);

function extractExploredFiles(toolCalls: IToolCallInfo[]): string[] {
	const files: string[] = [];
	for (const tc of toolCalls) {
		if (READ_TOOLS.has(tc.name) && tc.input) {
			try {
				const args = JSON.parse(tc.input);
				if (args.path) { files.push(args.path); }
				if (args.paths) { files.push(...args.paths); }
			} catch { /* ignore */ }
		}
	}
	return [...new Set(files)];
}

function extractSteps(toolCalls: IToolCallInfo[]): string[] {
	const steps: string[] = [];
	for (const tc of toolCalls) {
		if ((tc.name === 'todo_write' || tc.name === 'task_create') && tc.output) {
			const lines = tc.output.split('\n').filter(l => l.trim());
			steps.push(...lines);
		}
	}
	return steps;
}
