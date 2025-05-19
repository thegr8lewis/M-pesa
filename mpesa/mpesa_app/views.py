import requests, base64, json, re, os
from datetime import datetime
from django.shortcuts import render, redirect
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponseBadRequest
from .models import Transaction
from .forms import PaymentForm
from dotenv import load_dotenv
import traceback  

# Load environment variables
load_dotenv()

# Retrieve variables from the environment
CONSUMER_KEY = os.getenv("CONSUMER_KEY")
CONSUMER_SECRET = os.getenv("CONSUMER_SECRET")
MPESA_PASSKEY = os.getenv("MPESA_PASSKEY")
MPESA_SHORTCODE = os.getenv("MPESA_SHORTCODE")
CALLBACK_URL = os.getenv("CALLBACK_URL")
MPESA_BASE_URL = os.getenv("MPESA_BASE_URL")


@csrf_exempt
def payment_api(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            phone = format_phone_number(data["phone_number"])
            amount = data["amount"]
            
            # Validate amount
            try:
                amount_float = float(amount)
                if amount_float < 1:  # Minimum 1 KES
                    return JsonResponse({
                        "status": "error",
                        "message": "Amount must be at least 1 KES"
                    }, status=400)
            except ValueError:
                return JsonResponse({
                    "status": "error",
                    "message": "Invalid amount format"
                }, status=400)
            
            response = initiate_stk_push(phone, amount)
            
            if response.get("ResponseCode") == "0":
                # Save transaction to database
                Transaction.objects.create(
                    phone_number=phone,
                    amount=amount,
                    checkout_id=response["CheckoutRequestID"],
                    status="Pending"
                )
                
                return JsonResponse({
                    "status": "pending",
                    "checkout_request_id": response["CheckoutRequestID"],
                    "merchant_request_id": response["MerchantRequestID"],
                    "message": "STK push initiated successfully"
                })
            else:
                error_msg = response.get("errorMessage") or response.get("ResponseDescription") or "Failed to send STK push"
                return JsonResponse({
                    "status": "error",
                    "message": error_msg,
                    "raw_response": response
                }, status=400)
                
        except json.JSONDecodeError:
            return JsonResponse({
                "status": "error",
                "message": "Invalid JSON data"
            }, status=400)
        except ValueError as e:
            return JsonResponse({
                "status": "error",
                "message": str(e)
            }, status=400)
        except Exception as e:
            return JsonResponse({
                "status": "error",
                "message": str(e),
                "trace": traceback.format_exc()
            }, status=500)

    return JsonResponse({
        "error": "Invalid request method"
    }, status=405)

def format_phone_number(phone):
    phone = phone.replace("+", "").replace(" ", "")
    if re.match(r"^254\d{9}$", phone):
        return phone
    elif phone.startswith("0") and len(phone) == 10:
        return "254" + phone[1:]
    else:
        raise ValueError("Invalid phone number format. Use 07... or 254...")

def generate_access_token():
    try:
        credentials = f"{CONSUMER_KEY}:{CONSUMER_SECRET}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()

        headers = {
            "Authorization": f"Basic {encoded_credentials}",
            "Content-Type": "application/json",
        }
        response = requests.get(
            f"{MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials",
            headers=headers,
            timeout=30
        )

        response.raise_for_status()
        data = response.json()
        return data["access_token"]

    except requests.RequestException as e:
        raise Exception(f"Failed to connect to M-Pesa: {str(e)}")

def initiate_stk_push(phone, amount):
    try:
        token = generate_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        stk_password = base64.b64encode(
            (MPESA_SHORTCODE + MPESA_PASSKEY + timestamp).encode()
        ).decode()

        request_body = {
            "BusinessShortCode": MPESA_SHORTCODE,
            "Password": stk_password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": str(int(float(amount))),  # Ensure amount is string and whole number
            "PartyA": phone,
            "PartyB": MPESA_SHORTCODE,
            "PhoneNumber": phone,
            "CallBackURL": CALLBACK_URL,
            "AccountReference": "PAYMENT",
            "TransactionDesc": "Payment for services",
        }

        # print("Sending STK Push request:", json.dumps(request_body, indent=2))  # Debug logging

        response = requests.post(
            f"{MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest",
            json=request_body,
            headers=headers,
            timeout=30
        )

        # print("STK Push response:", response.text)  

        response.raise_for_status()
        return response.json()

    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        print(f"Response content: {http_err.response.text}")
        raise Exception(f"HTTP error from M-Pesa: {http_err.response.text}")
    except Exception as e:
        print(f"STK Push Error: {str(e)}")
        raise Exception(f"Failed to initiate STK Push: {str(e)}")

def query_stk_push(checkout_request_id):
    try:
        token = generate_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(
            (MPESA_SHORTCODE + MPESA_PASSKEY + timestamp).encode()
        ).decode()

        request_body = {
            "BusinessShortCode": MPESA_SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id
        }

        response = requests.post(
            f"{MPESA_BASE_URL}/mpesa/stkpushquery/v1/query",
            json=request_body,
            headers=headers,
            timeout=30
        )

        response.raise_for_status()
        return response.json()

    except requests.RequestException as e:
        print(f"Query Error: {str(e)}")
        return {"error": str(e)}

@csrf_exempt
def stk_status_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            checkout_request_id = data.get('checkout_request_id')
            
            if not checkout_request_id:
                return JsonResponse({
                    "error": "Missing checkout_request_id"
                }, status=400)

            status = query_stk_push(checkout_request_id)
            
            if "error" in status:
                return JsonResponse({
                    "error": status["error"]
                }, status=400)
                
            return JsonResponse({
                "status": status,
                "checkout_request_id": checkout_request_id
            })

        except json.JSONDecodeError:
            return JsonResponse({
                "error": "Invalid JSON body"
            }, status=400)
        except Exception as e:
            return JsonResponse({
                "error": str(e)
            }, status=500)

    return JsonResponse({
        "error": "Invalid request method"
    }, status=405)

@csrf_exempt
def payment_callback(request):
    if request.method != "POST":
        return HttpResponseBadRequest("Only POST requests are allowed")

    try:
        callback_data = json.loads(request.body)
        result_code = callback_data["Body"]["stkCallback"]["ResultCode"]

        if result_code == 0:
            checkout_id = callback_data["Body"]["stkCallback"]["CheckoutRequestID"]
            metadata = callback_data["Body"]["stkCallback"]["CallbackMetadata"]["Item"]

            amount = next(item["Value"] for item in metadata if item["Name"] == "Amount")
            mpesa_code = next(item["Value"] for item in metadata if item["Name"] == "MpesaReceiptNumber")
            phone = next(item["Value"] for item in metadata if item["Name"] == "PhoneNumber")

            Transaction.objects.create(
                amount=amount, 
                checkout_id=checkout_id, 
                mpesa_code=mpesa_code, 
                phone_number=phone, 
                status="Success"
            )
            return JsonResponse({
                "ResultCode": 0,
                "ResultDesc": "Payment successful"
            })

        return JsonResponse({
            "ResultCode": result_code,
            "ResultDesc": "Payment failed"
        })

    except (json.JSONDecodeError, KeyError) as e:
        return HttpResponseBadRequest(f"Invalid request data: {str(e)}")