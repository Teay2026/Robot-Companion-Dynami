FROM node:12.18.1

WORKDIR /server

COPY package.json package.json
COPY package-lock.json package-lock.json
COPY requirements.txt requirements.txt

RUN npm install
RUN apt-get update || : && apt-get install python -y
RUN python -m pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD [ "node", "index.js" ]