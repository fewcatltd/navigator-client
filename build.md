# Инструкции по сборке Airdrop Navigator

Эти инструкции помогут вам собрать клиент Airdrop Navigator из исходного кода.

Предварительные требования
------------------

Перед началом убедитесь, что у вас установлены следующие инструменты:
- [Node.js](https://nodejs.org/en/) (рекомендуется последняя стабильная версия)
- [Git](https://git-scm.com/downloads)
- Для сборки на Windows: [Windows Build Tools](https://www.npmjs.com/package/windows-build-tools)
- Для сборки на MacOS: Xcode Command Line Tools (`xcode-select --install`)

Скачивание исходного кода
------------------
1. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/fewcatltd/navigator-client.git
   cd navigator-client
   ```
2. Установите зависимости:
   ```bash
   npm install
   ```
   На маке может быть проблема. Ее регение тут node_modules/appdmg/lib/appdmg.js
3. Соберите приложение:
    - Для Windows:
      ```bash
      npm run make
      ```
   - Для MacOS:
     ```bash
       npm run make
     ```
    - Для Linux:
      ```bash
         npm run make
      ```
     Это создаст исполняемый файл приложения в папке `out/`

Проблемы и решения
------------------
Если у вас возникли проблемы в процессе сборки, пожалуйста, обратитесь к разделу проблем в репозитории или создайте новый запрос.