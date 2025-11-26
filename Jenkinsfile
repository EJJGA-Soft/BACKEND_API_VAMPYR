pipeline {
    agent any

    tools {
        nodejs 'NodeJS'
    }

    triggers {
        githubPush()
    }

    environment {
        SONARQUBE = 'sonarqube'
        SCANNER = 'sonar-scanner'
        SONAR_PROJECT_KEY = 'vampyr-backend-api'
    }

    stages {
        stage('Stop if not main branch') {
            when {
                not {
                    branch 'main'
                }
            }
            steps {
                echo "Push recibido, pero NO es main. Cancelando pipeline."
                script { 
                    currentBuild.result = 'ABORTED'
                    error("Stop: No es main")
                }
            }
        }

        stage('Checkout') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/main']],
                    userRemoteConfigs: [[
                        url: 'https://github.com/EJJGA-Soft/BACKEND_API_VAMPYR'
                    ]]
                ])
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Run Tests') {
            steps {
                sh 'npm test || true'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                    withSonarQubeEnv("${SONARQUBE}") {
                        sh """
                            ${tool SCANNER}/bin/sonar-scanner \
                                -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                                -Dsonar.sources=. \
                                -Dsonar.host.url=http://74.208.227.171:9000 \
                                -Dsonar.login=${SONAR_TOKEN}
                        """
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Deploy to Server') {
            steps {
                script {
                    withCredentials([
                        usernamePassword(
                            credentialsId: 'deploy-server-credentials',
                            usernameVariable: 'SSH_USER',
                            passwordVariable: 'SSH_PASS'
                        ),
                        string(credentialsId: 'deploy-server-host', variable: 'DEPLOY_HOST')
                    ]) {
                        sh '''
                            sshpass -p "${SSH_PASS}" ssh -o StrictHostKeyChecking=no ${SSH_USER}@${DEPLOY_HOST} << 'ENDSSH'
                                cd /home/VAMPYR/BACKEND_API_VAMPYR/
                                git pull origin main
                                cd ..

                                docker-compose down  
                                docker-compose up --build -d
                        '''
                    }
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline finalizado.'
        }
        success {
            echo 'Pipeline completado correctamente.'
        }
        failure {
            echo 'Pipeline falló.'
        }
    }
}
