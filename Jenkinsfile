pipeline {
    agent any

    stages {
        stage('Chekout Git Repository') {
            steps {
                git branch : 'main', credentialsId: 'shh-git-frankrojas31', url: 'https://github.com/EJJGA-Soft/BACKEND_API_VAMPYR.git'
            }
        }
        
        stage('install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Run Tests') {
            steps {
                sh 'npm test'
            }
        }

        stage('Sonarqube Analysis') {
            steps {
                withSonarQubeEnv('node-token') {
                    sh """
                    ${SONAR_SCANNER_HOME}/bin/sonar-scanner \ 
                    -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                    -Dsonar.sources=. \
                    -Dsonar.host.url=http://localhost:9000 \ 
                    -Dsonar.login=${SONAR_TOKEN}
                    """
                }
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }


        stage('Deploy') {
            steps {
                echo 'Deploying...'
            }
        }
    }
}