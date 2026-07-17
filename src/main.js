/**
 * main.js — FlowTask Entry Point
 */
import './styles/index.css';
import './styles/tabs.css';
import './styles/cards.css';
import './styles/modal.css';
import './styles/subtaskPanel.css';
import './styles/components.css';
import { initApp } from './app.js';


const root = document.getElementById('app');
if (root) {
  initApp(root);
}
