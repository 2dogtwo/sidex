import { Component, DOM, $ } from '../base.js';
import { IToolCallInfo } from '../../sidexChatService.js';

export class ToolCallItem extends Component {
	constructor(tc: IToolCallInfo) {
		super('div', 'sc-tool-call');

		const nameEl = this.append('span', 'sc-tool-name');
		nameEl.textContent = tc.name;

		const statusEl = this.append('span', 'sc-tool-status');
		if (tc.status === 'running') {
			statusEl.textContent = 'running...';
			statusEl.classList.add('running');
		} else if (tc.status === 'error') {
			statusEl.textContent = 'error';
			statusEl.classList.add('error');
		} else {
			statusEl.textContent = '✓';
			statusEl.classList.add('done');
		}
	}
}
