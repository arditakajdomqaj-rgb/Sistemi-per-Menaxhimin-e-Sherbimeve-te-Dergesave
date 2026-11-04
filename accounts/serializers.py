from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import User


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        # authenticate() krahason password-in me hash-in ne databaze.
        user = authenticate(username=attrs["username"], password=attrs["password"])
        if user is None:
            raise serializers.ValidationError("INVALID_CREDENTIALS")
        attrs["user"] = user
        return attrs


class UserSerializer(serializers.ModelSerializer):
    """Te dhenat publike te perdoruesit (pa password)."""

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "phone", "role", "is_active"]
        read_only_fields = ["id", "role"]


class CourierCreateSerializer(serializers.ModelSerializer):
    """Krijimi i nje korrieri nga admini. Password-i ruhet i hash-uar."""

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "phone", "password"]
        extra_kwargs = {"first_name": {"required": True}, "last_name": {"required": True}}

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data, role=User.Role.COURIER)
        user.set_password(password)  # hash-im, jo plain text
        user.save()
        return user
