pipeline {
    agent any

    tools {
        nodejs 'NodeJS'
    }

    environment {
        SONAR_PROJECT_KEY = 'vampyr-backend-api'
        SONAR_SCANNER_HOME = tool 'SonarScanner'
    }

    stages {
        stage('Checkout Git Repository') {
            steps {
                git branch : 'main', credentialsId: 'shh-git-frankrojas31', url: 'https://github.com/EJJGA-Soft/BACKEND_API_VAMPYR.git'
            }
        }
        
        stage('Install Dependencies') {
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
                withCredentials([string(credentialsId: 'node-token', variable: 'SONAR_TOKEN')]) {
                    withSonarQubeEnv('node-token') {
                        sh """
                        ${SONAR_SCANNER_HOME}/bin/sonar-scanner \
                            -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                            -Dsonar.sources=. \
                            -Dsonar.host.url=http://74.208.227.171:9000 \
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
    post {
        always {
            echo 'This will always run after the stages finish.'
        }
        success {
            echo 'This will run only if the pipeline succeeds.'
        }
        failure {
            echo 'This will run only if the pipeline fails.'
        }
    }
}