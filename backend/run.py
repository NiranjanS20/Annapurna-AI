import os
from app import create_app

app = create_app()

if __name__ == '__main__':
    # Railway passes a PORT environment variable, defaulting to 5000 if not set
    port = int(os.environ.get('PORT', 5000))
    # host='0.0.0.0' is required to expose the app to the outside world
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('FLASK_DEBUG') == '1')
