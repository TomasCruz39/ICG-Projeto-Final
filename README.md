# Mini-Golfe 3D

**Projeto desenvolvido para a unidade curricular de Introdução à Computação Gráfica (2025/2026).**

Um jogo de mini-golfe 3D interativo construído do zero utilizando a biblioteca **Three.js**. O projeto demonstra a aplicação prática de conceitos fundamentais de computação gráfica, incluindo modelação geométrica, transformações 3D, texturização, iluminação dinâmica e deteção de colisões.

---

## Sobre o Projeto

O objetivo deste projeto é colocar a bola no buraco no menor número de tacadas possível, navegando por percursos estilizados com níveis de dificuldade crescentes. O motor de jogo (física e colisões) foi escrito de raiz para este projeto, não recorrendo a motores de física externos (como Ammo.js ou Cannon.js).

### Funcionalidades Principais
* **5 Mapas Distintos:** Inclui "A Reta do Aprendiz", "O Zigue-Zague Móvel", "A Cidadela dos Eixos", "O Círculo de Gelo" e "A Torre da Queda Livre".
* **Menu Principal:** Seleção de mapas, histórico de pontuações e controlos essenciais.
* **Recordes Locais:** Tabela de pontuações por mapa guardada em `localStorage`.
* **VFX e Feedback:** Partículas de relva, splash de areia e celebração ao concluir o buraco.
* **Áudio Procedural:** Sons de tacada (otimizados com transientes de alta frequência), ressalto, entrada no buraco e ambiente gerados via Web Audio API.
* **Mecânicas Extra:** Zonas de impulso, pistas de gelo (baixo atrito) e blocos estruturais de areia (alto atrito).
* **Motor de Física Customizado:** Implementação de deteção de colisões contínua (AABB), deflexão vetorial, ressaltos, atrito e gravidade. O sistema inclui resolução avançada para evitar *clipping* quando a bola é esmagada entre obstáculos móveis e paredes estáticas.
* **Obstáculos Dinâmicos:** Blocos deslizantes e moinhos de vento rotativos que interagem fisicamente com a bola (incluindo cálculo dinâmico de normais de superfície em rotação).
* **Texturas Geradas Proceduralmente:** Uso de `CanvasTexture` para gerar padrões de relva, areia e pedra sem dependência de ficheiros de imagem externos.
* **Iluminação e Otimização Avançada:** Utilização de `HemisphereLight` e `DirectionalLight` com mapeamento de sombras suave (`PCFSoftShadowMap`). O motor foi otimizado com sistemas de *Cache* partilhada para Geometrias, Texturas e Materiais, reduzindo drasticamente o consumo de VRAM e mantendo o framerate fluido.
* **Câmara Dinâmica:** Câmara de jogo "orbital" focada na bola e um modo "Free Cam" em primeira pessoa para exploração do cenário.

---

## Controlos do Jogo

A interface do jogo é totalmente controlada por rato e teclado:

| Ação | Controlo |
| :--- | :--- |
| **Rodar a Câmara** | `Botão Esquerdo do Rato` (Manter e arrastar) |
| **Ajustar a Mira** | `Botão Direito do Rato` (Manter e arrastar) |
| **Ajustar Força** | `Setas Cima / Baixo` (↑ / ↓) |
| **Dar a Tacada** | `Espaço` ou `Enter` |
| **Reiniciar Mapa** | `R` |
| **Abrir Menu** | `Esc` ou `M` |
| **Mudar de Mapa** | Teclas `1` a `5` |

### Modo Espectador (Free Cam)
Ideal para inspecionar o Level Design e o encaixe geométrico das paredes.
* **Ativar/Desativar Free Cam:** Tecla `F`
* **Mover (Voo):** Teclas `W`, `A`, `S`, `D`
* **Olhar ao redor:** `Botão Esquerdo do Rato` (Manter e arrastar)

---

## 🛠️ Tecnologias e Ferramentas Utilizadas

* **HTML5 & CSS3:** Estrutura e Interface HUD/Menus.
* **JavaScript (ES6+):** Lógica do jogo e matemática vetorial.
* **[Three.js](https://threejs.org/):** Renderização WebGL, luzes, materiais e geometria.
* **Google Fonts (Space Grotesk):** Tipografia da interface.
* **Web Audio API:** Síntese de áudio procedural (SFX e ambiente).
* **Inteligência Artificial:** O desenvolvimento deste projeto contou com o apoio de ferramentas de IA, nomeadamente o **Google Gemini** e o **GitHub Copilot**, utilizados para auxiliar na estruturação da matemática da física, *troubleshooting* de bugs e otimização do código.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        