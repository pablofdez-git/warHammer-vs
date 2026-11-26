import * as vscode from 'vscode';
import { StateManager } from '../core/state';

// Contador de Puntos de Requisa en la barra de estado.
// En la Fase 4 el clic abrirá la Armería.
export class RequisitionStatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private readonly subscription: vscode.Disposable;

  constructor(private readonly state: StateManager) {
    this.item = vscode.window.createStatusBarItem(
      'warhammerCompanion.requisition',
      vscode.StatusBarAlignment.Right,
      100
    );
    this.item.name = 'Warhammer: Puntos de Requisa';
    this.item.tooltip = 'Puntos de Requisa (RP): se ganan al guardar código escrito';
    this.subscription = state.onDidChange(() => this.refresh());
    this.refresh();
    this.item.show();
  }

  refresh(): void {
    this.item.text = `$(shield) ${this.state.get().requisition} RP`;
  }

  // Oculta o muestra el contador (por ejemplo, al pausar el juego)
  setVisible(visible: boolean): void {
    if (visible) {
      this.item.show();
    } else {
      this.item.hide();
    }
  }

  dispose(): void {
    this.subscription.dispose();
    this.item.dispose();
  }
}
