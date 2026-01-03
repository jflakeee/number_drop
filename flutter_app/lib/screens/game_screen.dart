import 'package:flame/game.dart';
import 'package:flutter/material.dart';
import '../game/number_drop_game.dart';

class GameScreen extends StatefulWidget {
  const GameScreen({super.key});

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  late NumberDropGame game;
  int score = 0;
  int bestScore = 0;
  bool isGameOver = false;

  @override
  void initState() {
    super.initState();
    game = NumberDropGame();
    game.onScoreChanged = (s) => setState(() => score = s);
    game.onBestScoreChanged = (s) => setState(() => bestScore = s);
    game.onGameOver = () => setState(() => isGameOver = true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Game
          GameWidget(game: game),

          // Top bar with back button
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                      onPressed: () => _showExitDialog(),
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.pause, color: Colors.white),
                      onPressed: () => _showPauseDialog(),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Bottom items bar
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Container(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _ItemButton(
                      icon: '💣',
                      label: 'Bomb',
                      cost: 100,
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Tap a block to remove it!'),
                            duration: Duration(seconds: 2),
                          ),
                        );
                      },
                    ),
                    _ItemButton(
                      icon: '🔀',
                      label: 'Shuffle',
                      cost: 100,
                      onPressed: () {
                        game.useShuffle();
                      },
                    ),
                    _ItemButton(
                      icon: '🎬',
                      label: '+50 Coins',
                      cost: 0,
                      isAd: true,
                      onPressed: () {
                        game.addCoins(50);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('+50 coins added!'),
                            duration: Duration(seconds: 1),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Game Over overlay
          if (isGameOver)
            Container(
              color: Colors.black54,
              child: Center(
                child: Card(
                  color: const Color(0xFF393E46),
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'GAME OVER',
                          style: TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            color: Colors.red,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Score: $score',
                          style: const TextStyle(
                            fontSize: 24,
                            color: Colors.white,
                          ),
                        ),
                        Text(
                          'Best: $bestScore',
                          style: const TextStyle(
                            fontSize: 18,
                            color: Colors.white70,
                          ),
                        ),
                        const SizedBox(height: 24),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            ElevatedButton(
                              onPressed: () {
                                setState(() => isGameOver = false);
                                game.restartGame();
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFF96D00),
                              ),
                              child: const Text('Play Again'),
                            ),
                            const SizedBox(width: 16),
                            OutlinedButton(
                              onPressed: () => Navigator.pop(context),
                              child: const Text('Menu'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  void _showExitDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF393E46),
        title: const Text(
          'Exit Game?',
          style: TextStyle(color: Colors.white),
        ),
        content: const Text(
          'Your progress will be lost.',
          style: TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: const Text('Exit'),
          ),
        ],
      ),
    );
  }

  void _showPauseDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF393E46),
        title: const Text(
          'PAUSED',
          style: TextStyle(color: Colors.white),
          textAlign: TextAlign.center,
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Score: $score',
              style: const TextStyle(
                fontSize: 20,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Best: $bestScore',
              style: const TextStyle(
                fontSize: 16,
                color: Colors.white70,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
            },
            child: const Text('Menu'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFF96D00),
            ),
            child: const Text('Resume'),
          ),
        ],
      ),
    );
  }
}

class _ItemButton extends StatelessWidget {
  final String icon;
  final String label;
  final int cost;
  final bool isAd;
  final VoidCallback onPressed;

  const _ItemButton({
    required this.icon,
    required this.label,
    required this.cost,
    this.isAd = false,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF393E46),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isAd ? Colors.green : const Color(0xFFF96D00),
            width: 2,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(icon, style: const TextStyle(fontSize: 24)),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
            if (!isAd)
              Text(
                '🪙 $cost',
                style: const TextStyle(
                  fontSize: 10,
                  color: Color(0xFFFFD700),
                ),
              ),
            if (isAd)
              const Text(
                '📺 Ad',
                style: TextStyle(
                  fontSize: 10,
                  color: Colors.green,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
