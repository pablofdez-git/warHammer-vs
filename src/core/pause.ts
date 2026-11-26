import * as vscode from 'vscode';

const STORAGE_KEY = 'warhammerCompanion.paused';
// Las vistas del juego se ocultarán con "when": "!warhammerCompanion.paused" (Fase 3)
const CONTEXT_KEY = 'warhammerCompanion.paused';

// Pausa o reanuda el juego con un botón en la barra de estado.
// El estado se guarda en este ordenador y no se sincroniza.
export class PauseController implements vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<boolean>();
  readonly onDidChange = this.emitter.event;
  private readonly item: vscode.StatusBarItem;
  private paused: boolean;

  constructor(private readonly memento: vscode.Memento) {
    this.paused = memento.get<boolean>(STORAGE_KEY, false);
    this.item = vscode.window.createStatusBarItem(
      'warhammerCompanion.pause',
      vscode.StatusBarAlignment.Right,
      100
    );
    this.item.name = 'Warhammer: pausa';
    this.item.command = 'warhammerCompanion.togglePause';
    this.apply();
    this.item.show();
  }

  get isPaused(): boolean {
    return this.paused;
  }

  async toggle(): Promise<void> {
    this.paused = !this.paused;
    await this.memento.update(STORAGE_KEY, this.paused);
    this.apply();
    this.emitter.fire(this.paused);
  }

  private apply(): void {
    void vscode.commands.executeCommand('setContext', CONTEXT_KEY, this.paused);

    if (this.paused) {
      this.item.text = '$(play) Cruzada en pausa';
      this.item.tooltip = 'Reanudar Warhammer Companion';
    } else {
      this.item.text = '$(debug-pause)';
      this.item.tooltip = 'Pausar Warhammer Companion: sin Requisa, contactos ni paneles';
    }
  }

  dispose(): void {
    this.emitter.dispose();
    this.item.dispose();
  }
}
