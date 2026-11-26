import * as vscode from 'vscode';
import { PauseController } from './core/pause';
import { StateManager } from './core/state';
import { SyncService } from './core/syncService';
import { ActivityTracker } from './economy/activityTracker';
import { rewardForSave } from './economy/requisition';
import { RequisitionStatusBar } from './statusbar/requisitionStatusBar';

// Este archivo solo crea los módulos y los conecta entre sí

let syncService: SyncService | undefined;

export function activate(context: vscode.ExtensionContext) {
  const state = new StateManager(context.globalState);
  const pause = new PauseController(context.globalState);
  const statusBar = new RequisitionStatusBar(state);
  const tracker = new ActivityTracker();
  const sync = new SyncService(state, context.globalState);
  syncService = sync;

  // Si el juego arranca en pausa, el contador de RP no se ve
  statusBar.setVisible(!pause.isPaused);

  context.subscriptions.push(
    pause,
    statusBar,
    tracker,
    sync,

    pause.onDidChange((paused) => statusBar.setVisible(!paused)),

    vscode.workspace.onDidSaveTextDocument(async (document) => {
      if (pause.isPaused) {
        tracker.consume(document); // lo escrito en pausa no cuenta
        return;
      }
      const gained = await rewardForSave(state, tracker.peek(document));
      if (gained > 0) {
        tracker.consume(document); // solo se descuentan si dieron RP
        vscode.window.setStatusBarMessage(`+${gained} RP`, 3000);
        // Fase 3: aquí se tirará si aparece un contacto hostil
      }
    }),

    vscode.commands.registerCommand('warhammerCompanion.togglePause', () => pause.toggle()),

    vscode.commands.registerCommand('warhammerCompanion.syncNow', () => sync.syncNow()),

    vscode.commands.registerCommand('warhammerCompanion.resetProgress', async () => {
      const confirm = 'Reiniciar';
      const choice = await vscode.window.showWarningMessage(
        '¿Seguro que quieres reiniciar el progreso? Perderás tus Puntos de Requisa, también en los demás ordenadores sincronizados.',
        { modal: true },
        confirm
      );
      if (choice === confirm) {
        await state.reset();
        vscode.window.showInformationMessage('Progreso reiniciado');
      }
    })
  );

  void sync.start();
}

// Al cerrar VS Code, sube lo que quede pendiente
export function deactivate(): Thenable<void> | undefined {
  return syncService?.flush();
}
