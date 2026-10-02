---
name: statsmodels
description: Statsmodels is Python's premier library for statistical modeling, providing tools for estimation, inference, and diagnostics across a wide range of statistical methods. Use when the task involves statsmodels.
license: BSD-3-Clause license
metadata:
    skill-author: K-Dense Inc.
risk: unknown
source: community
---

# Statsmodels: Statistical Modeling and Econometrics

## Overview

Statsmodels is Python's premier library for statistical modeling, providing tools for estimation, inference, and diagnostics across a wide range of statistical methods. Apply this skill for rigorous statistical analysis, from simple linear regression to complex time series models and econometric analyses.

## When to Use This Skill

This skill should be used when:
- Fitting regression models (OLS, WLS, GLS, quantile regression)
- Performing generalized linear modeling (logistic, Poisson, Gamma, etc.)
- Analyzing discrete outcomes (binary, multinomial, count, ordinal)
- Conducting time series analysis (ARIMA, SARIMAX, VAR, forecasting)
- Running statistical tests and diagnostics
- Testing model assumptions (heteroskedasticity, autocorrelation, normality)
- Detecting outliers and influential observations
- Comparing models (AIC/BIC, likelihood ratio tests)
- Estimating causal effects
- Producing publication-ready statistical tables and inference

## Quick Start Guide

### Linear Regression (OLS)

> See [references/details.md](references/details.md) for full code examples.

### Logistic Regression (Binary Outcomes)

> See [references/details.md](references/details.md) for full code examples.

### Time Series (ARIMA)

> See [references/details.md](references/details.md) for full code examples.

### Generalized Linear Models (GLM)

> See [references/details.md](references/details.md) for full code examples.

## Core Statistical Modeling Capabilities

### 1. Linear Regression Models

Comprehensive suite of linear models for continuous outcomes with various error structures.

**Available models:**
- **OLS**: Standard linear regression with i.i.d. errors
- **WLS**: Weighted least squares for heteroskedastic errors
- **GLS**: Generalized least squares for arbitrary covariance structure
- **GLSAR**: GLS with autoregressive errors for time series
- **Quantile Regression**: Conditional quantiles (robust to outliers)
- **Mixed Effects**: Hierarchical/multilevel models with random effects
- **Recursive/Rolling**: Time-varying parameter estimation

**Key features:**
- Comprehensive diagnostic tests
- Robust standard errors (HC, HAC, cluster-robust)
- Influence statistics (Cook's distance, leverage, DFFITS)
- Hypothesis testing (F-tests, Wald tests)
- Model comparison (AIC, BIC, likelihood ratio tests)
- Prediction with confidence and prediction intervals

**When to use:** Continuous outcome variable, want inference on coefficients, need diagnostics

**Reference:** See `references/linear_models.md` for detailed guidance on model selection, diagnostics, and best practices.

### 2. Generalized Linear Models (GLM)

Flexible framework extending linear models to non-normal distributions.

**Distribution families:**
- **Binomial**: Binary outcomes or proportions (logistic regression)
- **Poisson**: Count data
- **Negative Binomial**: Overdispersed counts
- **Gamma**: Positive continuous, right-skewed data
- **Inverse Gaussian**: Positive continuous with specific variance structure
- **Gaussian**: Equivalent to OLS
- **Tweedie**: Flexible family for semi-continuous data

**Link functions:**
- Logit, Probit, Log, Identity, Inverse, Sqrt, CLogLog, Power
- Choose based on interpretation needs and model fit

**Key features:**
- Maximum likelihood estimation via IRLS
- Deviance and Pearson residuals
- Goodness-of-fit statistics
- Pseudo R-squared measures
- Robust standard errors

**When to use:** Non-normal outcomes, need flexible variance and link specifications

**Reference:** See `references/glm.md` for family selection, link functions, interpretation, and diagnostics.

### 3. Discrete Choice Models

Models for categorical and count outcomes.

**Binary models:**
- **Logit**: Logistic regression (odds ratios)
- **Probit**: Probit regression (normal distribution)

**Multinomial models:**
- **MNLogit**: Unordered categories (3+ levels)
- **Conditional Logit**: Choice models with alternative-specific variables
- **Ordered Model**: Ordinal outcomes (ordered categories)

**Count models:**
- **Poisson**: Standard count model
- **Negative Binomial**: Overdispersed counts
- **Zero-Inflated**: Excess zeros (ZIP, ZINB)
- **Hurdle Models**: Two-stage models for zero-heavy data

**Key features:**
- Maximum likelihood estimation
- Marginal effects at means or average marginal effects
- Model comparison via AIC/BIC
- Predicted probabilities and classification
- Goodness-of-fit tests

**When to use:** Binary, categorical, or count outcomes

**Reference:** See `references/discrete_choice.md` for model selection, interpretation, and evaluation.

### 4. Time Series Analysis

Comprehensive time series modeling and forecasting capabilities.

**Univariate models:**
- **AutoReg (AR)**: Autoregressive models
- **ARIMA**: Autoregressive integrated moving average
- **SARIMAX**: Seasonal ARIMA with exogenous variables
- **Exponential Smoothing**: Simple, Holt, Holt-Winters
- **ETS**: Innovations state space models

**Multivariate models:**
- **VAR**: Vector autoregression
- **VARMAX**: VAR with MA and exogenous variables
- **Dynamic Factor Models**: Extract common factors
- **VECM**: Vector error correction models (cointegration)

**Advanced models:**
- **State Space**: Kalman filtering, custom specifications
- **Regime Switching**: Markov switching models
- **ARDL**: Autoregressive distributed lag

**Key features:**
- ACF/PACF analysis for model identification
- Stationarity tests (ADF, KPSS)
- Forecasting with prediction intervals
- Residual diagnostics (Ljung-Box, heteroskedasticity)
- Granger causality testing
- Impulse response functions (IRF)
- Forecast error variance decomposition (FEVD)

**When to use:** Time-ordered data, forecasting, understanding temporal dynamics

**Reference:** See `references/time_series.md` for model selection, diagnostics, and forecasting methods.

### 5. Statistical Tests and Diagnostics

Extensive testing and diagnostic capabilities for model validation.

**Residual diagnostics:**
- Autocorrelation tests (Ljung-Box, Durbin-Watson, Breusch-Godfrey)
- Heteroskedasticity tests (Breusch-Pagan, White, ARCH)
- Normality tests (Jarque-Bera, Omnibus, Anderson-Darling, Lilliefors)
- Specification tests (RESET, Harvey-Collier)

**Influence and outliers:**
- Leverage (hat values)
- Cook's distance
- DFFITS and DFBETAs
- Studentized residuals
- Influence plots

**Hypothesis testing:**
- t-tests (one-sample, two-sample, paired)
- Proportion tests
- Chi-square tests
- Non-parametric tests (Mann-Whitney, Wilcoxon, Kruskal-Wallis)
- ANOVA (one-way, two-way, repeated measures)

**Multiple comparisons:**
- Tukey's HSD
- Bonferroni correction
- False Discovery Rate (FDR)

**Effect sizes and power:**
- Cohen's d, eta-squared
- Power analysis for t-tests, proportions
- Sample size calculations

**Robust inference:**
- Heteroskedasticity-consistent SEs (HC0-HC3)
- HAC standard errors (Newey-West)
- Cluster-robust standard errors

**When to use:** Validating assumptions, detecting problems, ensuring robust inference

**Reference:** See `references/stats_diagnostics.md` for comprehensive testing and diagnostic procedures.

## Formula API (R-style)

Statsmodels supports R-style formulas for intuitive model specification:

> See [references/details.md](references/details.md) for full code examples.

## Model Selection and Comparison

### Information Criteria

```python
# Compare models using AIC/BIC
models = {
    'Model 1': model1_results,
    'Model 2': model2_results,
    'Model 3': model3_results
}

comparison = pd.DataFrame({
    'AIC': {name: res.aic for name, res in models.items()},
    'BIC': {name: res.bic for name, res in models.items()},
    'Log-Likelihood': {name: res.llf for name, res in models.items()}
})

print(comparison.sort_values('AIC'))
# Lower AIC/BIC indicates better model
```

### Likelihood Ratio Test (Nested Models)

```python
# For nested models (one is subset of the other)
from scipy import stats

lr_stat = 2 * (full_model.llf - reduced_model.llf)
df = full_model.df_model - reduced_model.df_model
p_value = 1 - stats.chi2.cdf(lr_stat, df)

print(f"LR statistic: {lr_stat:.4f}")
print(f"p-value: {p_value:.4f}")

if p_value < 0.05:
    print("Full model significantly better")
else:
    print("Reduced model preferred (parsimony)")
```

### Cross-Validation

> See [references/details.md](references/details.md) for full code examples.

## Best Practices

### Data Preparation

1. **Always add constant**: Use `sm.add_constant()` unless excluding intercept
2. **Check for missing values**: Handle or impute before fitting
3. **Scale if needed**: Improves convergence, interpretation (but not required for tree models)
4. **Encode categoricals**: Use formula API or manual dummy coding

### Model Building

1. **Start simple**: Begin with basic model, add complexity as needed
2. **Check assumptions**: Test residuals, heteroskedasticity, autocorrelation
3. **Use appropriate model**: Match model to outcome type (binary→Logit, count→Poisson)
4. **Consider alternatives**: If assumptions violated, use robust methods or different model

### Inference

1. **Report effect sizes**: Not just p-values
2. **Use robust SEs**: When heteroskedasticity or clustering present
3. **Multiple comparisons**: Correct when testing many hypotheses
4. **Confidence intervals**: Always report alongside point estimates

### Model Evaluation

1. **Check residuals**: Plot residuals vs fitted, Q-Q plot
2. **Influence diagnostics**: Identify and investigate influential observations
3. **Out-of-sample validation**: Test on holdout set or cross-validate
4. **Compare models**: Use AIC/BIC for non-nested, LR test for nested

### Reporting

1. **Comprehensive summary**: Use `.summary()` for detailed output
2. **Document decisions**: Note transformations, excluded observations
3. **Interpret carefully**: Account for link functions (e.g., exp(β) for log link)
4. **Visualize**: Plot predictions, confidence intervals, diagnostics

## Common Workflows

### Workflow 1: Linear Regression Analysis

1. Explore data (plots, descriptives)
2. Fit initial OLS model
3. Check residual diagnostics
4. Test for heteroskedasticity, autocorrelation
5. Check for multicollinearity (VIF)
6. Identify influential observations
7. Refit with robust SEs if needed
8. Interpret coefficients and inference
9. Validate on holdout or via CV

### Workflow 2: Binary Classification

1. Fit logistic regression (Logit)
2. Check for convergence issues
3. Interpret odds ratios
4. Calculate marginal effects
5. Evaluate classification performance (AUC, confusion matrix)
6. Check for influential observations
7. Compare with alternative models (Probit)
8. Validate predictions on test set

### Workflow 3: Count Data Analysis

1. Fit Poisson regression
2. Check for overdispersion
3. If overdispersed, fit Negative Binomial
4. Check for excess zeros (consider ZIP/ZINB)
5. Interpret rate ratios
6. Assess goodness of fit
7. Compare models via AIC
8. Validate predictions

### Workflow 4: Time Series Forecasting

1. Plot series, check for trend/seasonality
2. Test for stationarity (ADF, KPSS)
3. Difference if non-stationary
4. Identify p, q from ACF/PACF
5. Fit ARIMA or SARIMAX
6. Check residual diagnostics (Ljung-Box)
7. Generate forecasts with confidence intervals
8. Evaluate forecast accuracy on test set

## Reference Documentation

This skill includes comprehensive reference files for detailed guidance:

### references/linear_models.md
Detailed coverage of linear regression models including:
- OLS, WLS, GLS, GLSAR, Quantile Regression
- Mixed effects models
- Recursive and rolling regression
- Comprehensive diagnostics (heteroskedasticity, autocorrelation, multicollinearity)
- Influence statistics and outlier detection
- Robust standard errors (HC, HAC, cluster)
- Hypothesis testing and model comparison

### references/glm.md
Complete guide to generalized linear models:
- All distribution families (Binomial, Poisson, Gamma, etc.)
- Link functions and when to use each
- Model fitting and interpretation
- Pseudo R-squared and goodness of fit
- Diagnostics and residual analysis
- Applications (logistic, Poisson, Gamma regression)

### references/discrete_choice.md
Comprehensive guide to discrete outcome models:
- Binary models (Logit, Probit)
- Multinomial models (MNLogit, Conditional Logit)
- Count models (Poisson, Negative Binomial, Zero-Inflated, Hurdle)
- Ordinal models
- Marginal effects and interpretation
- Model diagnostics and comparison

### references/time_series.md
In-depth time series analysis guidance:
- Univariate models (AR, ARIMA, SARIMAX, Exponential Smoothing)
- Multivariate models (VAR, VARMAX, Dynamic Factor)
- State space models
- Stationarity testing and diagnostics
- Forecasting methods and evaluation
- Granger causality, IRF, FEVD

### references/stats_diagnostics.md
Comprehensive statistical testing and diagnostics:
- Residual diagnostics (autocorrelation, heteroskedasticity, normality)
- Influence and outlier detection
- Hypothesis tests (parametric and non-parametric)
- ANOVA and post-hoc tests
- Multiple comparisons correction
- Robust covariance matrices
- Power analysis and effect sizes

**When to reference:**
- Need detailed parameter explanations
- Choosing between similar models
- Troubleshooting convergence or diagnostic issues
- Understanding specific test statistics
- Looking for code examples for advanced features

**Search patterns:**
```bash
# Find information about specific models
grep -r "Quantile Regression" references/

# Find diagnostic tests
grep -r "Breusch-Pagan" references/stats_diagnostics.md

# Find time series guidance
grep -r "SARIMAX" references/time_series.md
> See [references/details.md](references/details.md) for full code examples.
