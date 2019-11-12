function theta = logregress(data)

% Calculate the number of training entries...
[m, n] = size(data);
P = 0.8;
idx = randperm(m);
train = data(idx(1:round(P*m)),:); 
test = data(idx(round(P*m)+1:end),:);

% Build our feature matrix and output vector
[m, n] = size(train);
X = train(:, 1:n-1);
y = train(:, n);
n = n - 1;

%  Set options for fminunc
options = optimset('GradObj', 'on', 'MaxIter', 400);
initial_theta = zeros(n + 1, 1);
X = [ones(m,1) X];

%  Run fminunc to obtain the optimal theta
%  This function will return theta and the cost
[theta, cost] = ...
    fminunc(@(t)(costFunction(t, X, y)), initial_theta, options);

% Calculate the error applied to the test set
[m, n] = size(test);
testX = test(:, 1:n-1);
testy = test(:, n);
n = n - 1;
testX = [ones(m,1) testX];

[J, grad] = costFunction(theta, testX, testy);
J

end
