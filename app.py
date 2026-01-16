from flask import Flask, render_template, jsonify, request
import json
import os

app = Flask(__name__)

# Папка для хранения рекордов
SCORES_FILE = 'scores.json'

# Инициализация файла с рекордами
if not os.path.exists(SCORES_FILE):
    with open(SCORES_FILE, 'w') as f:
        json.dump([], f)

@app.route('/')
def index():
    """Главная страница с игрой"""
    return render_template('index.html')

@app.route('/api/scores', methods=['GET', 'POST'])
def scores():
    """API для работы с рекордами"""
    if request.method == 'GET':
        try:
            with open(SCORES_FILE, 'r') as f:
                scores_data = json.load(f)
            # Сортируем по убыванию очков и берем топ-10
            sorted_scores = sorted(scores_data, key=lambda x: x['score'], reverse=True)[:10]
            return jsonify(sorted_scores)
        except:
            return jsonify([])
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            name = data.get('name', 'Anonymous')
            score = data.get('score', 0)
            level = data.get('level', 1)
            lines = data.get('lines', 0)
            
            new_score = {
                'name': name[:10],  # Ограничиваем длину имени
                'score': score,
                'level': level,
                'lines': lines,
                'date': json.dumps(str(json.datetime.now()), default=str)
            }
            
            with open(SCORES_FILE, 'r') as f:
                scores_data = json.load(f)
            
            scores_data.append(new_score)
            
            with open(SCORES_FILE, 'w') as f:
                json.dump(scores_data, f, indent=2)
            
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)})

@app.route('/api/tetrominoes')
def get_tetrominoes():
    """API для получения информации о тетромино"""
    tetrominoes = {
        'I': {
            'shape': [[1, 1, 1, 1]],
            'color': '#00f0f0'  # Циан
        },
        'J': {
            'shape': [[1, 0, 0], [1, 1, 1]],
            'color': '#0000f0'  # Синий
        },
        'L': {
            'shape': [[0, 0, 1], [1, 1, 1]],
            'color': '#f0a000'  # Оранжевый
        },
        'O': {
            'shape': [[1, 1], [1, 1]],
            'color': '#f0f000'  # Желтый
        },
        'S': {
            'shape': [[0, 1, 1], [1, 1, 0]],
            'color': '#00f000'  # Зеленый
        },
        'T': {
            'shape': [[0, 1, 0], [1, 1, 1]],
            'color': '#a000f0'  # Фиолетовый
        },
        'Z': {
            'shape': [[1, 1, 0], [0, 1, 1]],
            'color': '#f00000'  # Красный
        }
    }
    return jsonify(tetrominoes)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)